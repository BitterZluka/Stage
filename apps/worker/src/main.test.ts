import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@creator-platform/database";
import { MockHederaProvider } from "@creator-platform/hedera";
import { processOneOutboxEvent } from "./main.js";

const runDatabaseTests = process.env.RUN_DATABASE_INTEGRATION_TESTS === "1";

test(
  "reward outbox confirms one idempotent mock Hedera payout",
  { skip: !runDatabaseTests, timeout: 30_000 },
  async () => {
    const database = new PrismaClient();
    const suffix = randomUUID().slice(0, 8);
    const previousTreasury = process.env.HEDERA_TREASURY_ACCOUNT_ID;
    process.env.HEDERA_TREASURY_ACCOUNT_ID = "0.0.5005";
    await database.$connect();
    const creatorUser = await database.user.create({ data: {} });
    const recipient = await database.user.create({
      data: {
        wallets: {
          create: {
            accountId: `0.0.${Date.now()}`,
            verifiedAt: new Date(),
          },
        },
      },
    });
    const creator = await database.creator.create({
      data: {
        ownerUserId: creatorUser.id,
        handle: `worker_test_${suffix}`,
        displayName: "Worker Test",
        token: {
          create: {
            hederaTokenId: `0.0.${Date.now() + 1}`,
            name: "Worker Test Credits",
            symbol: "WTC",
            decimals: 0,
            totalSupply: "1000",
            status: "ACTIVE",
          },
        },
      },
    });
    const challenge = await database.challenge.create({
      data: {
        creatorId: creator.id,
        title: "Worker reward test",
        description: "Confirms the payout state machine.",
        status: "JUDGING",
        submissionKind: "LINK",
        startsAt: new Date(Date.now() - 120_000),
        submissionDeadline: new Date(Date.now() - 60_000),
        requiresWorldVerification: false,
      },
    });
    const submission = await database.submission.create({
      data: {
        challengeId: challenge.id,
        authorUserId: recipient.id,
        status: "WINNER",
        artifactRefs: { evidenceUrl: "https://example.com/evidence" },
      },
    });
    const reservation = await database.rewardReservation.create({
      data: {
        challengeId: challenge.id,
        submissionId: submission.id,
        recipientId: recipient.id,
        amount: "100",
      },
    });
    const payout = await database.rewardPayout.create({
      data: {
        reservationId: reservation.id,
        recipientId: recipient.id,
        amount: "100",
      },
    });
    const idempotencyKey = `challenge-reward:${submission.id}`;
    await database.outboxEvent.create({
      data: {
        idempotencyKey,
        eventType: "CHALLENGE_REWARD_REQUESTED",
        aggregateId: payout.id,
        payload: {
          challengeId: challenge.id,
          submissionId: submission.id,
          payoutId: payout.id,
        },
      },
    });

    try {
      assert.equal(
        await processOneOutboxEvent(database, new MockHederaProvider()),
        true,
      );
      const confirmed = await database.rewardPayout.findUniqueOrThrow({
        where: { id: payout.id },
      });
      assert.equal(confirmed.status, "CONFIRMED");
      assert.equal(confirmed.transactionId, `mock-${idempotencyKey}`);
    } finally {
      await database.outboxEvent.deleteMany({
        where: {
          OR: [
            { idempotencyKey },
            { idempotencyKey: `reward-hcs:${payout.id}` },
          ],
        },
      });
      await database.auditEvent.deleteMany({ where: { entityId: payout.id } });
      await database.blockchainTransaction.deleteMany({
        where: { idempotencyKey },
      });
      await database.rewardPayout.delete({ where: { id: payout.id } });
      await database.rewardReservation.delete({
        where: { id: reservation.id },
      });
      await database.submission.delete({ where: { id: submission.id } });
      await database.challenge.delete({ where: { id: challenge.id } });
      await database.creatorToken.delete({ where: { creatorId: creator.id } });
      await database.creator.delete({ where: { id: creator.id } });
      await database.wallet.deleteMany({ where: { userId: recipient.id } });
      await database.user.deleteMany({
        where: { id: { in: [creatorUser.id, recipient.id] } },
      });
      await database.$disconnect();
      if (previousTreasury === undefined) {
        delete process.env.HEDERA_TREASURY_ACCOUNT_ID;
      } else {
        process.env.HEDERA_TREASURY_ACCOUNT_ID = previousTreasury;
      }
    }
  },
);

test(
  "perk HCS outbox event is processed idempotently",
  { skip: !runDatabaseTests, timeout: 30_000 },
  async () => {
    const database = new PrismaClient();
    await database.$connect();
    const aggregateId = randomUUID();
    const event = await database.outboxEvent.create({
      data: {
        idempotencyKey: `perk-activated:${aggregateId}`,
        eventType: "HCS_PERK_ACTIVATED",
        aggregateId,
        payload: {
          perkId: aggregateId,
          creatorId: randomUUID(),
          tokenThreshold: "100",
          inventory: 10,
        },
      },
    });
    try {
      assert.equal(
        await processOneOutboxEvent(database, new MockHederaProvider()),
        true,
      );
      const processed = await database.outboxEvent.findUniqueOrThrow({
        where: { id: event.id },
      });
      assert.equal(processed.status, "CONFIRMED");
      assert.ok(processed.publishedAt);
    } finally {
      await database.outboxEvent.delete({ where: { id: event.id } });
      await database.$disconnect();
    }
  },
);
