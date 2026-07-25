import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { DatabaseService } from "../database/database.service.js";
import { ChallengeService } from "./challenge.service.js";

const runDatabaseTests = process.env.RUN_DATABASE_INTEGRATION_TESTS === "1";

test(
  "creator can list and delete only an owned draft challenge",
  { skip: !runDatabaseTests, timeout: 30_000 },
  async () => {
    const database = new DatabaseService();
    const challenges = new ChallengeService(database);
    const suffix = randomUUID().slice(0, 8);
    let userId: string | undefined;
    let creatorId: string | undefined;
    let challengeId: string | undefined;

    await database.$connect();
    try {
      const user = await database.user.create({ data: {} });
      userId = user.id;
      const creator = await database.creator.create({
        data: {
          ownerUserId: user.id,
          handle: `challenge_owner_${suffix}`,
          displayName: "Challenge Owner",
        },
      });
      creatorId = creator.id;
      const challenge = await challenges.create(creator.id, {
        creatorId: creator.id,
        title: "Private creator draft",
        description: "A draft visible only inside the creator studio.",
        submissionKind: "text",
        verificationMode: "manual",
        startsAt: new Date(Date.now() + 60_000).toISOString(),
        submissionDeadline: new Date(Date.now() + 3_600_000).toISOString(),
        participationRewardAmount: "0",
        rewardAmount: "100",
        maxWinners: 1,
        participationTokenAmount: "0",
      });
      challengeId = challenge.id;

      await assert.rejects(() => challenges.listOwned(null, { limit: 20 }));
      const owned = await challenges.listOwned(creator.id, { limit: 20 });
      assert.equal(
        owned.items.some((item) => item.id === challenge.id),
        true,
      );
      await assert.rejects(() =>
        challenges.deleteDraft(challenge.id, randomUUID(), challenge.version),
      );

      await challenges.deleteDraft(challenge.id, creator.id, challenge.version);
      challengeId = undefined;
      assert.equal(
        await database.challenge.count({ where: { id: challenge.id } }),
        0,
      );
    } finally {
      if (challengeId) {
        await database.rewardRule.deleteMany({ where: { challengeId } });
        await database.challenge.deleteMany({ where: { id: challengeId } });
      }
      if (creatorId) {
        await database.outboxEvent.deleteMany({
          where: { idempotencyKey: `creator-token:${creatorId}` },
        });
        await database.creatorToken.deleteMany({ where: { creatorId } });
        await database.creator.deleteMany({ where: { id: creatorId } });
      }
      if (userId) {
        await database.user.deleteMany({ where: { id: userId } });
      }
      await database.$disconnect();
    }
  },
);
