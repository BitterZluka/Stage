import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { DatabaseService } from "../database/database.service.js";
import { ChallengeService } from "../challenges/challenge.service.js";
import { ManualChallengeVerifier } from "./challenge-verifier.js";
import { SubmissionService } from "./submission.service.js";

const runDatabaseTests = process.env.RUN_DATABASE_INTEGRATION_TESTS === "1";

test(
  "manual challenge flow reserves exactly one final winner slot",
  { skip: !runDatabaseTests, timeout: 30_000 },
  async () => {
    const database = new DatabaseService();
    const challenges = new ChallengeService(database);
    const submissions = new SubmissionService(
      database,
      new ManualChallengeVerifier(),
    );
    const suffix = randomUUID().slice(0, 8);
    const userIds: string[] = [];
    let creatorId: string | undefined;
    let challengeId: string | undefined;
    const submissionIds: string[] = [];

    await database.$connect();
    try {
      const creatorUser = await database.user.create({ data: {} });
      const fanOne = await database.user.create({ data: {} });
      const fanTwo = await database.user.create({ data: {} });
      userIds.push(creatorUser.id, fanOne.id, fanTwo.id);
      const creator = await database.creator.create({
        data: {
          ownerUserId: creatorUser.id,
          handle: `challenge_test_${suffix}`,
          displayName: "Challenge Test",
        },
      });
      creatorId = creator.id;
      const challenge = await challenges.create(creator.id, {
        creatorId: creator.id,
        title: "Manual video challenge",
        description: "Submit a public video for manual creator review.",
        submissionKind: "video",
        verificationMode: "manual",
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        submissionDeadline: new Date(Date.now() + 3_600_000).toISOString(),
        rewardAmount: "100",
        maxWinners: 1,
        requiresWorldVerification: false,
      });
      challengeId = challenge.id;
      await assert.rejects(() =>
        challenges.publish(challenge.id, randomUUID()),
      );
      await challenges.publish(challenge.id, creator.id);
      const first = await submissions.create(challenge.id, fanOne.id, {
        evidenceUrl: "https://example.com/video/one",
      });
      await assert.rejects(() =>
        submissions.create(challenge.id, fanOne.id, {
          evidenceUrl: "https://example.com/video/duplicate",
        }),
      );
      const second = await submissions.create(challenge.id, fanTwo.id, {
        evidenceUrl: "https://example.com/video/two",
      });
      submissionIds.push(first.id, second.id);
      await challenges.transition(challenge.id, creator.id, "close");

      const results = await Promise.allSettled([
        submissions.decide(first.id, creator.id, {
          decision: "accept",
          expectedVersion: 1,
        }),
        submissions.decide(second.id, creator.id, {
          decision: "accept",
          expectedVersion: 1,
        }),
      ]);

      assert.equal(
        results.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(
        await database.rewardReservation.count({
          where: { challengeId: challenge.id },
        }),
        1,
      );
      assert.equal(
        await database.submission.count({
          where: { challengeId: challenge.id, status: "WINNER" },
        }),
        1,
      );
      const undecided = await database.submission.findFirstOrThrow({
        where: { challengeId: challenge.id, status: "SUBMITTED" },
      });
      const rejection = await submissions.decide(undecided.id, creator.id, {
        decision: "reject",
        expectedVersion: undecided.version,
        reasonCode: "NOT_SELECTED",
        note: "Another submission won the final reward slot.",
      });
      assert.equal(rejection.submission.status, "rejected");
      const completed = await challenges.transition(
        challenge.id,
        creator.id,
        "complete",
      );
      assert.equal(completed.status, "completed");
    } finally {
      if (challengeId) {
        await database.outboxEvent.deleteMany({
          where: {
            OR: [
              { aggregateId: challengeId },
              { payload: { path: ["challengeId"], equals: challengeId } },
            ],
          },
        });
        await database.rewardPayout.deleteMany({
          where: { reservation: { challengeId } },
        });
        await database.rewardReservation.deleteMany({ where: { challengeId } });
        await database.worldRewardClaim.deleteMany({ where: { challengeId } });
        await database.auditEvent.deleteMany({
          where: {
            OR: [
              { entityId: { in: submissionIds } },
              { payload: { path: ["challengeId"], equals: challengeId } },
            ],
          },
        });
        await database.submission.deleteMany({ where: { challengeId } });
        await database.rewardRule.deleteMany({ where: { challengeId } });
        await database.challenge.deleteMany({ where: { id: challengeId } });
      }
      if (creatorId) {
        await database.creator.deleteMany({ where: { id: creatorId } });
      }
      await database.user.deleteMany({ where: { id: { in: userIds } } });
      await database.$disconnect();
    }
  },
);
