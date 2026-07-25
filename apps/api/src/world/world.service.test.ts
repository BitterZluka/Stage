import assert from "node:assert/strict";
import { test } from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import {
  FakeWorldProvider,
  WorldProviderError,
  worldError,
  type WorldServerConfig,
} from "@stage/world/server";
import {
  STAGE_SELFIE_ENROLMENT_ACTION,
  type WorldVerificationStatus,
} from "@stage/world/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "../auth/auth.service.js";
import { WorldController } from "./world.controller.js";
import { WorldEligibilityService } from "./world-eligibility.service.js";
import { WorldService } from "./world.service.js";
import type {
  PersistWorldVerificationInput,
  WorldIdentityRepository,
} from "./world.types.js";

class InMemoryWorldRepository implements WorldIdentityRepository {
  readonly identities = new Map<
    string,
    {
      id: string;
      subjectKey?: string;
      status: WorldVerificationStatus;
    }
  >();
  readonly replayOwners = new Map<string, string>();
  readonly claims = new Map<string, string>();
  readonly eligibleChallenges = new Set<string>();
  readonly submissions = new Set<string>();

  async getStatus(userId: string): Promise<WorldVerificationStatus> {
    return this.identities.get(userId)?.status ?? { verified: false };
  }

  async persistVerification(
    input: PersistWorldVerificationInput,
  ): Promise<WorldVerificationStatus> {
    const replayKey = `${input.action}:${input.verification.replayKey}`;
    const replayOwner = this.replayOwners.get(replayKey);
    if (replayOwner) {
      if (replayOwner !== input.userId) {
        throw worldError("PROOF_REPLAYED", "Proof belongs to another user");
      }
      const existingIdentity = this.identities.get(input.userId);
      if (existingIdentity) return existingIdentity.status;
    }
    const subjectOwner = [...this.identities.entries()].find(
      ([userId, identity]) =>
        userId !== input.userId &&
        input.verification.subjectKey !== undefined &&
        identity.subjectKey === input.verification.subjectKey,
    );
    if (subjectOwner) {
      throw worldError("IDENTITY_CONFLICT", "Identity belongs to another user");
    }
    const existing = this.identities.get(input.userId);
    if (
      existing?.subjectKey &&
      input.verification.subjectKey &&
      existing.subjectKey !== input.verification.subjectKey
    ) {
      throw worldError("IDENTITY_CONFLICT", "Identity changed");
    }
    const status: WorldVerificationStatus = {
      verified: true,
      credentialType: input.verification.credentialType,
      verifiedAt: input.verification.verifiedAt,
      provider: input.provider,
    };
    this.identities.set(input.userId, {
      id: existing?.id ?? `identity-${input.userId}`,
      ...(input.verification.subjectKey
        ? { subjectKey: input.verification.subjectKey }
        : {}),
      status,
    });
    this.replayOwners.set(replayKey, input.userId);
    return status;
  }

  async assertRewardEligibility(input: {
    userId: string;
    challengeId: string;
    rewardType: string;
  }): Promise<{ worldIdentityId: string }> {
    const identity = this.identities.get(input.userId);
    if (
      !identity ||
      !this.eligibleChallenges.has(input.challengeId) ||
      !this.submissions.has(`${input.challengeId}:${input.userId}`)
    ) {
      throw worldError("IDENTITY_CONFLICT", "Reward is not eligible");
    }
    if (
      this.claims.has(`${input.challengeId}:${identity.id}:${input.rewardType}`)
    ) {
      throw worldError("PROOF_REPLAYED", "Reward was already claimed");
    }
    return { worldIdentityId: identity.id };
  }

  async reserveRewardClaim(input: {
    worldIdentityId: string;
    challengeId: string;
    rewardType: string;
  }): Promise<{ id: string; created: boolean }> {
    const key = `${input.challengeId}:${input.worldIdentityId}:${input.rewardType}`;
    const existing = this.claims.get(key);
    if (existing) return { id: existing, created: false };
    const id = `claim-${this.claims.size + 1}`;
    this.claims.set(key, id);
    return { id, created: true };
  }
}

const config: WorldServerConfig = {
  provider: "fake",
  environment: "staging",
  appId: "app_fake_stage",
  rpId: "rp_fake_stage",
  action: STAGE_SELFIE_ENROLMENT_ACTION,
  verifyBaseUrl: "https://developer.world.org",
  fakeScenario: "success",
  rpContextTtlSeconds: 300,
};

const user = { id: "user-1", accountIds: ["0.0.123"] };

test("rp-context binds authenticated user and verified wallet", async () => {
  const service = new WorldService(
    new FakeWorldProvider(),
    config,
    new InMemoryWorldRepository(),
  );
  const context = await service.createRpContext(user);
  assert.equal(context.action, STAGE_SELFIE_ENROLMENT_ACTION);
  assert.match(context.signal, /^stage:v1:[0-9a-f]{64}$/);
  assert.equal(context.provider, "fake");

  await assert.rejects(
    service.createRpContext({ id: "user-2", accountIds: [] }),
    /verified Hedera wallet/,
  );
});

test("verification succeeds and is idempotent for the same user and proof", async () => {
  const repository = new InMemoryWorldRepository();
  const service = new WorldService(new FakeWorldProvider(), config, repository);
  const context = await service.createRpContext(user);
  const proof = {
    kind: "stage_fake_world_proof",
    action: context.action,
    signal: context.signal,
    replayKey: "replay-1",
  };
  const first = await service.verify(user, proof);
  const second = await service.verify(user, proof);
  assert.equal(first.verified, true);
  assert.deepEqual(second, first);
  assert.equal(repository.replayOwners.size, 1);
});

test("provider failure scenarios remain stable backend errors", async () => {
  for (const [scenario, code] of [
    ["invalid_proof", "PROOF_INVALID"],
    ["expired", "PROOF_EXPIRED"],
    ["duplicate", "PROOF_REPLAYED"],
    ["unavailable", "SELFIE_CHECK_UNAVAILABLE"],
  ] as const) {
    const service = new WorldService(
      new FakeWorldProvider({ scenario }),
      { ...config, fakeScenario: scenario },
      new InMemoryWorldRepository(),
    );
    const context = await service.createRpContext(user);
    await assert.rejects(
      service.verify(user, {
        kind: "stage_fake_world_proof",
        action: context.action,
        signal: context.signal,
        replayKey: "replay",
      }),
      (error: unknown) =>
        error instanceof WorldProviderError && error.code === code,
    );
  }
});

test("identity conflicts and proof replay across users are rejected", async () => {
  const repository = new InMemoryWorldRepository();
  const verification = {
    success: true as const,
    protocolVersion: "unknown" as const,
    credentialType: "selfie_check" as const,
    subjectKey: "same-subject",
    replayKey: "same-replay",
    verifiedAt: "2026-07-25T12:00:00.000Z",
  };
  await repository.persistVerification({
    userId: "user-1",
    provider: "fake",
    action: STAGE_SELFIE_ENROLMENT_ACTION,
    signalHash: "signal-1",
    verification,
  });
  await assert.rejects(
    repository.persistVerification({
      userId: "user-2",
      provider: "fake",
      action: STAGE_SELFIE_ENROLMENT_ACTION,
      signalHash: "signal-2",
      verification,
    }),
    (error: unknown) =>
      error instanceof WorldProviderError &&
      (error.code === "PROOF_REPLAYED" || error.code === "IDENTITY_CONFLICT"),
  );
});

test("reward claim is unique per challenge, identity, and reward type", async () => {
  const repository = new InMemoryWorldRepository();
  await repository.persistVerification({
    userId: user.id,
    provider: "fake",
    action: STAGE_SELFIE_ENROLMENT_ACTION,
    signalHash: "signal",
    verification: {
      success: true,
      protocolVersion: "unknown",
      credentialType: "selfie_check",
      subjectKey: "subject",
      replayKey: "replay",
      verifiedAt: "2026-07-25T12:00:00.000Z",
    },
  });
  repository.eligibleChallenges.add("challenge-1");
  repository.submissions.add("challenge-1:user-1");
  const eligibility = new WorldEligibilityService(repository);
  const eligible = await eligibility.assertWorldEligibilityForReward({
    userId: user.id,
    challengeId: "challenge-1",
    rewardType: "creator_credit",
  });
  const first = await eligibility.reserveWorldRewardClaim({
    ...eligible,
    challengeId: "challenge-1",
    rewardType: "creator_credit",
  });
  const second = await eligibility.reserveWorldRewardClaim({
    ...eligible,
    challengeId: "challenge-1",
    rewardType: "creator_credit",
  });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.id, first.id);
});

test("controller rejects an unauthenticated rp-context request", async () => {
  const authService = {
    getSession: async () => null,
  } as unknown as AuthService;
  const service = new WorldService(
    new FakeWorldProvider(),
    config,
    new InMemoryWorldRepository(),
  );
  const controller = new WorldController(authService, service);
  const request = { cookies: {} } as FastifyRequest;
  const reply = {
    header: () => reply,
  } as unknown as FastifyReply;
  await assert.rejects(
    controller.createRpContext(request, {}, reply),
    UnauthorizedException,
  );
});
