import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import {
  buildWalletLoginMessage,
  randomOpaqueValue,
  sha256,
} from "./auth.crypto.js";
import type {
  CreateLoginChallengeInput,
  CreateSessionInput,
} from "./auth.schemas.js";
import {
  WALLET_SIGNATURE_VERIFIER,
  type AuthSessionView,
  type WalletSignatureVerifier,
} from "./auth.types.js";

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : fallback;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function unauthorized(code: string, message: string): UnauthorizedException {
  return new UnauthorizedException({ error: { code, message } });
}

@Injectable()
export class AuthService {
  private readonly challengeTtlSeconds = positiveInteger(
    process.env.LOGIN_CHALLENGE_TTL_SECONDS,
    300,
  );
  private readonly sessionTtlSeconds = positiveInteger(
    process.env.SESSION_TTL_SECONDS,
    86_400,
  );
  private readonly appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  private readonly network = process.env.HEDERA_NETWORK ?? "testnet";

  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
    @Inject(WALLET_SIGNATURE_VERIFIER)
    private readonly signatureVerifier: WalletSignatureVerifier,
  ) {}

  async createLoginChallenge(input: CreateLoginChallengeInput): Promise<{
    challengeId: string;
    message: string;
    expiresAt: string;
  }> {
    const now = new Date();
    const recentChallenges = await this.database.loginChallenge.count({
      where: {
        accountId: input.accountId,
        createdAt: { gte: new Date(now.getTime() - 60_000) },
      },
    });
    if (recentChallenges >= 5) {
      throw new HttpException(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many login challenges were requested",
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const expiresAt = new Date(
      now.getTime() + this.challengeTtlSeconds * 1_000,
    );
    const nonce = randomOpaqueValue();
    const message = buildWalletLoginMessage({
      accountId: input.accountId,
      nonce,
      issuedAt: now,
      expiresAt,
      appUrl: this.appUrl,
      network: this.network,
    });

    const challenge = await this.database.$transaction(async (transaction) => {
      await transaction.loginChallenge.updateMany({
        where: {
          accountId: input.accountId,
          usedAt: null,
        },
        data: { usedAt: now },
      });
      return transaction.loginChallenge.create({
        data: {
          accountId: input.accountId,
          message,
          nonceHash: sha256(nonce),
          expiresAt,
        },
      });
    });

    return {
      challengeId: challenge.id,
      message: challenge.message,
      expiresAt: challenge.expiresAt.toISOString(),
    };
  }

  async createSession(input: CreateSessionInput): Promise<{
    token: string;
    view: AuthSessionView;
  }> {
    const challenge = await this.database.loginChallenge.findUnique({
      where: { id: input.challengeId },
    });
    const now = new Date();
    if (
      !challenge ||
      challenge.usedAt ||
      challenge.expiresAt <= now ||
      challenge.attempts >= 5
    ) {
      throw unauthorized(
        "LOGIN_CHALLENGE_INVALID",
        "The login challenge is invalid or expired",
      );
    }

    await this.database.loginChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });

    let verification: Awaited<ReturnType<WalletSignatureVerifier["verify"]>>;
    try {
      verification = await this.signatureVerifier.verify({
        accountId: challenge.accountId,
        message: challenge.message,
        signatureBase64: input.signature,
      });
    } catch {
      throw new ServiceUnavailableException({
        error: {
          code: "SIGNATURE_VERIFICATION_UNAVAILABLE",
          message: "Wallet signature verification is temporarily unavailable",
        },
      });
    }
    if (!verification.valid || verification.accountId !== challenge.accountId) {
      throw unauthorized("SIGNATURE_INVALID", "Wallet signature is invalid");
    }

    const token = randomOpaqueValue();
    const tokenHash = sha256(token);
    const expiresAt = new Date(now.getTime() + this.sessionTtlSeconds * 1_000);

    const result = await this.database.$transaction(async (transaction) => {
      const consumed = await transaction.loginChallenge.updateMany({
        where: {
          id: challenge.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) {
        throw unauthorized(
          "LOGIN_CHALLENGE_INVALID",
          "The login challenge has already been used",
        );
      }

      const wallet = await transaction.wallet.upsert({
        where: { accountId: challenge.accountId },
        create: {
          accountId: challenge.accountId,
          publicKey: verification.publicKey,
          verifiedAt: now,
          user: { create: {} },
        },
        update: {
          publicKey: verification.publicKey,
          verifiedAt: now,
        },
        include: { user: { include: { wallets: true } } },
      });
      await transaction.session.create({
        data: {
          userId: wallet.userId,
          tokenHash,
          expiresAt,
        },
      });
      return wallet.user;
    });

    return {
      token,
      view: {
        user: {
          id: result.id,
          accountIds: result.wallets.map((wallet) => wallet.accountId).sort(),
        },
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  async getSession(token: string | undefined): Promise<AuthSessionView | null> {
    if (!token) return null;
    const session = await this.database.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { include: { wallets: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return null;
    }
    return {
      user: {
        id: session.user.id,
        accountIds: session.user.wallets
          .map((wallet) => wallet.accountId)
          .sort(),
      },
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  async revokeSession(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.database.session.updateMany({
      where: {
        tokenHash: sha256(token),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}
