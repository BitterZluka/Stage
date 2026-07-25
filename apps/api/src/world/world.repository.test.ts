import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@creator-platform/database";
import { WorldProviderError } from "@stage/world/server";
import { STAGE_SELFIE_ENROLMENT_ACTION } from "@stage/world/shared";
import type { DatabaseService } from "../database/database.service.js";
import { PrismaWorldIdentityRepository } from "./world.repository.js";

const verificationInput = {
  userId: "user-2",
  provider: "fake" as const,
  action: STAGE_SELFIE_ENROLMENT_ACTION,
  signalHash: "signal-hash",
  verification: {
    success: true as const,
    protocolVersion: "unknown" as const,
    credentialType: "selfie_check" as const,
    subjectKey: "subject-2",
    sessionId: "session-2",
    replayKey: "replay-key",
    verifiedAt: "2026-07-25T12:00:00.000Z",
  },
};

function isWorldError(code: string) {
  return (error: unknown): boolean =>
    error instanceof WorldProviderError && error.code === code;
}

test("persistVerification rejects a proof replay owned by another user", async () => {
  const transaction = {
    worldIdentity: {
      findUnique: async () => null,
    },
    worldProofReplay: {
      findUnique: async () => ({
        worldIdentityId: "identity-user-1",
      }),
    },
  };
  const database = {
    $transaction: async (
      callback: (tx: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as DatabaseService;
  const repository = new PrismaWorldIdentityRepository(database);

  await assert.rejects(
    repository.persistVerification(verificationInput),
    isWorldError("PROOF_REPLAYED"),
  );
});

test("persistVerification is idempotent for the same identity and replay", async () => {
  const existing = {
    id: "identity-user-2",
    credentialType: "selfie_check",
    verifiedAt: new Date("2026-07-25T12:00:00.000Z"),
    provider: "fake",
    subjectKey: "subject-2",
    sessionId: "session-2",
  };
  const transaction = {
    worldIdentity: {
      findUnique: async () => existing,
    },
    worldProofReplay: {
      findUnique: async () => ({
        worldIdentityId: existing.id,
      }),
    },
  };
  const database = {
    $transaction: async (
      callback: (tx: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as DatabaseService;
  const repository = new PrismaWorldIdentityRepository(database);

  const result = await repository.persistVerification(verificationInput);

  assert.deepEqual(result, {
    verified: true,
    credentialType: "selfie_check",
    verifiedAt: "2026-07-25T12:00:00.000Z",
    provider: "fake",
  });
});

test("persistVerification rejects subject and session changes", async () => {
  for (const existing of [
    {
      id: "identity-user-2",
      subjectKey: "different-subject",
      sessionId: "session-2",
    },
    {
      id: "identity-user-2",
      subjectKey: "subject-2",
      sessionId: "different-session",
    },
  ]) {
    const transaction = {
      worldIdentity: { findUnique: async () => existing },
      worldProofReplay: { findUnique: async () => null },
    };
    const database = {
      $transaction: async (
        callback: (tx: typeof transaction) => Promise<unknown>,
      ) => callback(transaction),
    } as unknown as DatabaseService;
    const repository = new PrismaWorldIdentityRepository(database);

    await assert.rejects(
      repository.persistVerification(verificationInput),
      isWorldError("IDENTITY_CONFLICT"),
    );
  }
});

test("assertRewardEligibility requires a challenge submission", async () => {
  const database = {
    challenge: {
      findUnique: async () => ({
        requiresWorldVerification: true,
        submissions: [],
      }),
    },
  } as unknown as DatabaseService;
  const repository = new PrismaWorldIdentityRepository(database);

  await assert.rejects(
    repository.assertRewardEligibility({
      userId: "user-1",
      challengeId: "challenge-1",
      rewardType: "creator_credit",
    }),
    isWorldError("IDENTITY_CONFLICT"),
  );
});

test("assertRewardEligibility requires World identity and rejects duplicate claims", async () => {
  const baseChallenge = {
    requiresWorldVerification: true,
    submissions: [{ id: "submission-1" }],
  };
  const withoutIdentity = {
    challenge: { findUnique: async () => baseChallenge },
    worldIdentity: { findUnique: async () => null },
  } as unknown as DatabaseService;
  await assert.rejects(
    new PrismaWorldIdentityRepository(
      withoutIdentity,
    ).assertRewardEligibility({
      userId: "user-1",
      challengeId: "challenge-1",
      rewardType: "creator_credit",
    }),
    isWorldError("IDENTITY_CONFLICT"),
  );

  const duplicateClaim = {
    challenge: { findUnique: async () => baseChallenge },
    worldIdentity: { findUnique: async () => ({ id: "identity-1" }) },
    worldRewardClaim: {
      findUnique: async () => ({ id: "claim-1" }),
    },
  } as unknown as DatabaseService;
  await assert.rejects(
    new PrismaWorldIdentityRepository(
      duplicateClaim,
    ).assertRewardEligibility({
      userId: "user-1",
      challengeId: "challenge-1",
      rewardType: "creator_credit",
    }),
    isWorldError("PROOF_REPLAYED"),
  );
});

test("assertRewardEligibility returns the verified identity for a fresh claim", async () => {
  const database = {
    challenge: {
      findUnique: async () => ({
        requiresWorldVerification: true,
        submissions: [{ id: "submission-1" }],
      }),
    },
    worldIdentity: { findUnique: async () => ({ id: "identity-1" }) },
    worldRewardClaim: { findUnique: async () => null },
  } as unknown as DatabaseService;
  const repository = new PrismaWorldIdentityRepository(database);

  assert.deepEqual(
    await repository.assertRewardEligibility({
      userId: "user-1",
      challengeId: "challenge-1",
      rewardType: "creator_credit",
    }),
    { worldIdentityId: "identity-1" },
  );
});

test("reserveRewardClaim creates once and returns the existing claim on P2002", async () => {
  const input = {
    worldIdentityId: "identity-1",
    challengeId: "challenge-1",
    rewardType: "creator_credit",
  };
  const createdDatabase = {
    worldRewardClaim: {
      create: async () => ({ id: "claim-1" }),
    },
  } as unknown as DatabaseService;
  const created = await new PrismaWorldIdentityRepository(
    createdDatabase,
  ).reserveRewardClaim(input);
  assert.deepEqual(created, { id: "claim-1", created: true });

  const uniqueError = new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed",
    { code: "P2002", clientVersion: "test" },
  );
  const duplicateDatabase = {
    worldRewardClaim: {
      create: async () => {
        throw uniqueError;
      },
      findUnique: async () => ({ id: "claim-1" }),
    },
  } as unknown as DatabaseService;
  const duplicate = await new PrismaWorldIdentityRepository(
    duplicateDatabase,
  ).reserveRewardClaim(input);
  assert.deepEqual(duplicate, { id: "claim-1", created: false });
});
