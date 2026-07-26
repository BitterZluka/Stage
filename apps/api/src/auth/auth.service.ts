import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { StageHederaError } from "@creator-platform/hedera";
import { DatabaseService } from "../database/database.service.js";
import { ensureCreatorTokenProvisioning } from "../tokens/creator-token-provisioning.js";
import {
  buildWalletLoginMessage,
  randomOpaqueValue,
  sha256,
} from "./auth.crypto.js";
import type {
  CompleteOnboardingInput,
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function toSessionView(
  user: {
    id: string;
    primaryIntent: "FAN" | "CREATOR" | null;
    onboardingCompletedAt: Date | null;
    wallets: { accountId: string }[];
    creator: { id: string } | null;
  },
  expiresAt: Date,
): AuthSessionView {
  return {
    user: {
      id: user.id,
      accountIds: user.wallets.map((wallet) => wallet.accountId).sort(),
      primaryIntent: user.primaryIntent
        ? (user.primaryIntent.toLowerCase() as "fan" | "creator")
        : null,
      onboardingRequired: user.onboardingCompletedAt === null,
      hasCreatorProfile: user.creator !== null,
      creatorId: user.creator?.id ?? null,
    },
    expiresAt: expiresAt.toISOString(),
  };
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
    const identity = input.accountId.startsWith("0x")
      ? input.accountId.toLowerCase()
      : input.accountId;
    const recentChallenges = await this.database.loginChallenge.count({
      where: {
        accountId: identity,
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
      accountId: identity,
      nonce,
      issuedAt: now,
      expiresAt,
      appUrl: this.appUrl,
      network: this.network,
    });

    const challenge = await this.database.$transaction(async (transaction) => {
      await transaction.loginChallenge.updateMany({
        where: {
          accountId: identity,
          usedAt: null,
        },
        data: { usedAt: now },
      });
      return transaction.loginChallenge.create({
        data: {
          accountId: identity,
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
        identity: challenge.accountId,
        message: challenge.message,
        signature: input.signature,
      });
    } catch (error) {
      if (
        error instanceof StageHederaError &&
        error.code === "MIRROR_NODE_NOT_FOUND"
      ) {
        throw unauthorized(
          "WALLET_ACCOUNT_NOT_FOUND",
          "The wallet account does not exist on Hedera testnet",
        );
      }
      throw new ServiceUnavailableException({
        error: {
          code: "SIGNATURE_VERIFICATION_UNAVAILABLE",
          message: "Wallet signature verification is temporarily unavailable",
        },
      });
    }
    if (!verification.valid) {
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
        where: { accountId: verification.accountId },
        create: {
          accountId: verification.accountId,
          publicKey: verification.publicKey,
          verifiedAt: now,
          user: { create: {} },
        },
        update: {
          publicKey: verification.publicKey,
          verifiedAt: now,
        },
        include: { user: { include: { wallets: true, creator: true } } },
      });
      if (wallet.user.creator) {
        await ensureCreatorTokenProvisioning(
          transaction,
          wallet.user.creator.id,
        );
      }
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
      view: toSessionView(result, expiresAt),
    };
  }

  async completeOnboarding(
    token: string | undefined,
    input: CompleteOnboardingInput,
  ): Promise<AuthSessionView> {
    if (!token) {
      throw unauthorized("UNAUTHENTICATED", "A valid session is required");
    }
    const session = await this.database.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { include: { wallets: true, creator: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw unauthorized("UNAUTHENTICATED", "A valid session is required");
    }
    if (session.user.onboardingCompletedAt) {
      return toSessionView(session.user, session.expiresAt);
    }

    try {
      const user = await this.database.$transaction(async (transaction) => {
        const current = await transaction.user.findUniqueOrThrow({
          where: { id: session.userId },
          include: { wallets: true, creator: true },
        });
        if (current.onboardingCompletedAt) return current;

        if (input.intent === "creator" && !current.creator) {
          const creator = await transaction.creator.create({
            data: {
              ownerUserId: current.id,
              handle: input.handle,
              displayName: input.displayName,
            },
          });
          await ensureCreatorTokenProvisioning(transaction, creator.id);
        }
        await transaction.user.update({
          where: { id: current.id },
          data: {
            primaryIntent: input.intent === "creator" ? "CREATOR" : "FAN",
            onboardingCompletedAt: new Date(),
          },
        });
        return transaction.user.findUniqueOrThrow({
          where: { id: current.id },
          include: { wallets: true, creator: true },
        });
      });
      return toSessionView(user, session.expiresAt);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException({
          error: {
            code: "HANDLE_TAKEN",
            message: "This creator handle is already taken",
          },
        });
      }
      throw error;
    }
  }

  async getSession(token: string | undefined): Promise<AuthSessionView | null> {
    if (!token) return null;
    const session = await this.database.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { include: { wallets: true, creator: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return null;
    }
    return toSessionView(session.user, session.expiresAt);
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
