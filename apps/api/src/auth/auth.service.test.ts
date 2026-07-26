import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ConflictException,
  HttpException,
  UnauthorizedException,
} from "@nestjs/common";
import type { DatabaseService } from "../database/database.service.js";
import { sha256 } from "./auth.crypto.js";
import { AuthService } from "./auth.service.js";
import type { WalletSignatureVerifier } from "./auth.types.js";

function verifier(
  result: Awaited<ReturnType<WalletSignatureVerifier["verify"]>> = {
    valid: true,
    accountId: "0.0.123",
    publicKey: "test-public-key",
  },
): WalletSignatureVerifier {
  return { verify: async () => result };
}

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof HttpException)) return undefined;
  const response = error.getResponse();
  if (typeof response !== "object" || response === null) return undefined;
  const body = response as { error?: { code?: string } };
  return body.error?.code;
}

function challenge(overrides: Record<string, unknown> = {}) {
  return {
    id: "challenge-1",
    accountId: "0.0.123",
    message: "Sign this message",
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    attempts: 0,
    ...overrides,
  };
}

test("createLoginChallenge normalizes EVM identity and invalidates older challenges", async () => {
  const writes: Array<{
    accountId: string;
    message: string;
    nonceHash: string;
  }> = [];
  let invalidatedAccountId: string | undefined;
  const transaction = {
    loginChallenge: {
      updateMany: async (query: {
        where: { accountId: string };
      }): Promise<{ count: number }> => {
        invalidatedAccountId = query.where.accountId;
        return { count: 1 };
      },
      create: async (query: {
        data: { accountId: string; message: string; nonceHash: string };
      }) => {
        writes.push(query.data);
        return {
          id: "challenge-1",
          message: query.data.message,
          expiresAt: new Date(Date.now() + 60_000),
        };
      },
    },
  };
  const database = {
    loginChallenge: { count: async () => 0 },
    $transaction: async (
      callback: (tx: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as DatabaseService;
  const service = new AuthService(database, verifier());

  const input = `0x${"AB".repeat(20)}`;
  const result = await service.createLoginChallenge({ accountId: input });

  assert.equal(invalidatedAccountId, input.toLowerCase());
  assert.equal(writes[0]?.accountId, input.toLowerCase());
  assert.match(writes[0]?.message ?? "", new RegExp(input.toLowerCase()));
  assert.match(writes[0]?.nonceHash ?? "", /^[a-f0-9]{64}$/);
  assert.equal(result.challengeId, "challenge-1");
});

test("createLoginChallenge enforces the per-wallet rate limit", async () => {
  const database = {
    loginChallenge: { count: async () => 5 },
  } as unknown as DatabaseService;
  const service = new AuthService(database, verifier());

  await assert.rejects(
    service.createLoginChallenge({ accountId: "0.0.123" }),
    (error: unknown) =>
      error instanceof HttpException &&
      error.getStatus() === 429 &&
      errorCode(error) === "RATE_LIMITED",
  );
});

test("createSession rejects used, expired, and exhausted challenges", async () => {
  for (const invalid of [
    challenge({ usedAt: new Date() }),
    challenge({ expiresAt: new Date(Date.now() - 1) }),
    challenge({ attempts: 5 }),
  ]) {
    const database = {
      loginChallenge: { findUnique: async () => invalid },
    } as unknown as DatabaseService;
    const service = new AuthService(database, verifier());

    await assert.rejects(
      service.createSession({
        challengeId: invalid.id,
        signature: "valid-signature",
      }),
      (error: unknown) =>
        error instanceof UnauthorizedException &&
        errorCode(error) === "LOGIN_CHALLENGE_INVALID",
    );
  }
});

test("createSession rejects an invalid signature after recording the attempt", async () => {
  let attemptsIncremented = false;
  const database = {
    loginChallenge: {
      findUnique: async () => challenge(),
      update: async () => {
        attemptsIncremented = true;
      },
    },
  } as unknown as DatabaseService;
  const service = new AuthService(
    database,
    verifier({ valid: false, accountId: "0.0.123", publicKey: null }),
  );

  await assert.rejects(
    service.createSession({
      challengeId: "challenge-1",
      signature: "invalid-signature",
    }),
    (error: unknown) =>
      error instanceof UnauthorizedException &&
      errorCode(error) === "SIGNATURE_INVALID",
  );
  assert.equal(attemptsIncremented, true);
});

test("createSession consumes once and stores only the session token hash", async () => {
  let storedTokenHash: string | undefined;
  const user = {
    id: "user-1",
    primaryIntent: null,
    onboardingCompletedAt: null,
    wallets: [{ accountId: "0.0.123" }],
    creator: null,
  };
  const transaction = {
    loginChallenge: { updateMany: async () => ({ count: 1 }) },
    wallet: {
      upsert: async () => ({ userId: user.id, user }),
    },
    session: {
      create: async (query: { data: { tokenHash: string } }) => {
        storedTokenHash = query.data.tokenHash;
      },
    },
  };
  const database = {
    loginChallenge: {
      findUnique: async () => challenge(),
      update: async () => challenge({ attempts: 1 }),
    },
    $transaction: async (
      callback: (tx: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as DatabaseService;
  const service = new AuthService(database, verifier());

  const result = await service.createSession({
    challengeId: "challenge-1",
    signature: "valid-signature",
  });

  assert.notEqual(result.token, storedTokenHash);
  assert.equal(storedTokenHash, sha256(result.token));
  assert.deepEqual(result.view.user.accountIds, ["0.0.123"]);
  assert.equal(result.view.user.onboardingRequired, true);
});

test("createSession idempotently provisions a token for an existing creator", async () => {
  const user = {
    id: "user-1",
    primaryIntent: "CREATOR" as const,
    onboardingCompletedAt: new Date(),
    wallets: [{ accountId: "0.0.123" }],
    creator: { id: "creator-1" },
  };
  let token:
    | {
        id: string;
        creatorId: string;
        status: string;
        hederaTokenId: string | null;
      }
    | undefined;
  const outboxEvents = new Map<string, { aggregateId: string }>();
  const transaction = {
    loginChallenge: { updateMany: async () => ({ count: 1 }) },
    wallet: {
      upsert: async () => ({ userId: user.id, user }),
    },
    creator: {
      findUnique: async () => ({
        id: user.creator.id,
        handle: "creator",
        displayName: "Creator",
      }),
    },
    creatorToken: {
      upsert: async (query: {
        create: { creatorId: string; status: string };
      }) => {
        token ??= {
          id: "creator-token-1",
          creatorId: query.create.creatorId,
          status: query.create.status,
          hederaTokenId: null,
        };
        return token;
      },
    },
    outboxEvent: {
      upsert: async (query: {
        where: { idempotencyKey: string };
        create: { aggregateId: string };
      }) => {
        if (!outboxEvents.has(query.where.idempotencyKey)) {
          outboxEvents.set(query.where.idempotencyKey, {
            aggregateId: query.create.aggregateId,
          });
        }
      },
    },
    session: { create: async () => undefined },
  };
  const database = {
    loginChallenge: {
      findUnique: async () => challenge(),
      update: async () => challenge({ attempts: 1 }),
    },
    $transaction: async (
      callback: (tx: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as DatabaseService;
  const service = new AuthService(database, verifier());

  await service.createSession({
    challengeId: "challenge-1",
    signature: "valid-signature",
  });
  await service.createSession({
    challengeId: "challenge-2",
    signature: "valid-signature",
  });

  assert.equal(token?.creatorId, "creator-1");
  assert.equal(outboxEvents.size, 1);
  assert.equal(
    outboxEvents.get("creator-token:creator-1")?.aggregateId,
    "creator-token-1",
  );
});

test("createSession rejects a concurrent second challenge consume", async () => {
  const transaction = {
    loginChallenge: { updateMany: async () => ({ count: 0 }) },
  };
  const database = {
    loginChallenge: {
      findUnique: async () => challenge(),
      update: async () => challenge({ attempts: 1 }),
    },
    $transaction: async (
      callback: (tx: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as DatabaseService;
  const service = new AuthService(database, verifier());

  await assert.rejects(
    service.createSession({
      challengeId: "challenge-1",
      signature: "valid-signature",
    }),
    (error: unknown) =>
      error instanceof UnauthorizedException &&
      errorCode(error) === "LOGIN_CHALLENGE_INVALID",
  );
});

test("completeOnboarding is idempotent for an already onboarded user", async () => {
  let transactionCalled = false;
  const onboardedUser = {
    id: "user-1",
    primaryIntent: "FAN" as const,
    onboardingCompletedAt: new Date(),
    wallets: [{ accountId: "0.0.123" }],
    creator: null,
  };
  const database = {
    session: {
      findUnique: async () => ({
        userId: onboardedUser.id,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        user: onboardedUser,
      }),
    },
    $transaction: async () => {
      transactionCalled = true;
    },
  } as unknown as DatabaseService;
  const service = new AuthService(database, verifier());

  const result = await service.completeOnboarding("session-token", {
    intent: "fan",
  });

  assert.equal(transactionCalled, false);
  assert.equal(result.user.primaryIntent, "fan");
  assert.equal(result.user.onboardingRequired, false);
});

test("completeOnboarding maps creator handle uniqueness to HANDLE_TAKEN", async () => {
  const pendingUser = {
    id: "user-1",
    primaryIntent: null,
    onboardingCompletedAt: null,
    wallets: [{ accountId: "0.0.123" }],
    creator: null,
  };
  const database = {
    session: {
      findUnique: async () => ({
        userId: pendingUser.id,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        user: pendingUser,
      }),
    },
    $transaction: async () => {
      throw { code: "P2002" };
    },
  } as unknown as DatabaseService;
  const service = new AuthService(database, verifier());

  await assert.rejects(
    service.completeOnboarding("session-token", {
      intent: "creator",
      handle: "taken",
      displayName: "Taken Creator",
    }),
    (error: unknown) =>
      error instanceof ConflictException && errorCode(error) === "HANDLE_TAKEN",
  );
});
