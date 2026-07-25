import assert from "node:assert/strict";
import test from "node:test";
import {
  createChallengeSchema,
  deleteChallengeSchema,
  listOwnedChallengesSchema,
} from "./challenge.schemas.js";
import { challengeTransitionTarget } from "./challenge.service.js";

const validChallenge = {
  creatorId: "5f0f2e7f-dfc1-49c4-b417-b43c665b20db",
  title: "Use my sound",
  description: "Publish a creative public video using the campaign sound.",
  submissionKind: "video",
  verificationMode: "manual",
  startsAt: "2026-07-26T10:00:00.000Z",
  submissionDeadline: "2026-07-27T10:00:00.000Z",
  rewardAmount: "100",
  maxWinners: 3,
  participationTokenAmount: "25",
};

test("challenge creation accepts a bounded manual reward policy", () => {
  assert.equal(createChallengeSchema.safeParse(validChallenge).success, true);
});

test("challenge creation rejects invalid dates and zero rewards", () => {
  const result = createChallengeSchema.safeParse({
    ...validChallenge,
    startsAt: validChallenge.submissionDeadline,
    rewardAmount: "0",
  });
  assert.equal(result.success, false);
});

test("challenge creation accepts free or token-gated participation", () => {
  assert.equal(
    createChallengeSchema.safeParse({
      ...validChallenge,
      participationTokenAmount: "0",
    }).success,
    true,
  );
  assert.equal(
    createChallengeSchema.safeParse({
      ...validChallenge,
      participationTokenAmount: "-1",
    }).success,
    false,
  );
});

test("challenge lifecycle only permits documented transitions", () => {
  assert.equal(challengeTransitionTarget("PUBLISHED", "close"), "JUDGING");
  assert.equal(challengeTransitionTarget("JUDGING", "complete"), "COMPLETED");
  assert.equal(challengeTransitionTarget("DRAFT", "cancel"), "CANCELLED");
  assert.equal(challengeTransitionTarget("DRAFT", "close"), null);
  assert.equal(challengeTransitionTarget("COMPLETED", "cancel"), null);
});

test("creator challenge listing includes private lifecycle states", () => {
  assert.equal(
    listOwnedChallengesSchema.safeParse({ status: "draft", limit: "100" })
      .success,
    true,
  );
  assert.equal(
    listOwnedChallengesSchema.safeParse({ status: "cancelled" }).success,
    true,
  );
});

test("challenge deletion requires a positive expected version", () => {
  assert.equal(
    deleteChallengeSchema.safeParse({ expectedVersion: 2 }).success,
    true,
  );
  assert.equal(
    deleteChallengeSchema.safeParse({ expectedVersion: 0 }).success,
    false,
  );
});
