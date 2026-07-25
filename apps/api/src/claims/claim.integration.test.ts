import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { DatabaseService } from "../database/database.service.js";
import { PerkService } from "../perks/perk.service.js";
import { ClaimService } from "./claim.service.js";
import type { TokenBalanceReader } from "./token-balance-reader.js";

const runDatabaseTests = process.env.RUN_DATABASE_INTEGRATION_TESTS === "1";

class EligibleBalanceReader implements TokenBalanceReader {
  async getTokenBalance() {
    return { associated: true, balance: 1_000n };
  }
}

test(
  "token-gated perk reserves one final slot and supports manual fulfillment",
  { skip: !runDatabaseTests, timeout: 30_000 },
  async () => {
    const database = new DatabaseService();
    const perks = new PerkService(database);
    const claims = new ClaimService(database, new EligibleBalanceReader());
    const suffix = randomUUID().slice(0, 8);
    const accountBase = Date.now();
    const userIds: string[] = [];
    let creatorId: string | undefined;
    let perkId: string | undefined;

    await database.$connect();
    try {
      const creatorUser = await database.user.create({ data: {} });
      const fanOne = await database.user.create({ data: {} });
      const fanTwo = await database.user.create({ data: {} });
      const unverifiedFan = await database.user.create({ data: {} });
      userIds.push(creatorUser.id, fanOne.id, fanTwo.id, unverifiedFan.id);
      await database.wallet.createMany({
        data: [
          {
            userId: fanOne.id,
            accountId: `0.0.${accountBase}`,
            verifiedAt: new Date(),
          },
          {
            userId: fanTwo.id,
            accountId: `0.0.${accountBase + 1}`,
            verifiedAt: new Date(),
          },
          {
            userId: unverifiedFan.id,
            accountId: `0.0.${accountBase + 2}`,
            verifiedAt: new Date(),
          },
        ],
      });
      for (const user of [fanOne, fanTwo]) {
        await database.worldIdentity.create({
          data: {
            userId: user.id,
            provider: "fake",
            protocolVersion: "1",
            credentialType: "selfie_check",
            subjectKey: randomUUID(),
            signalHash: randomUUID().replaceAll("-", ""),
            verifiedAt: new Date(),
          },
        });
      }
      const creator = await database.creator.create({
        data: {
          ownerUserId: creatorUser.id,
          handle: `perk_test_${suffix}`,
          displayName: "Perk Test",
          token: {
            create: {
              hederaTokenId: `0.0.${accountBase + 3}`,
              name: "Perk Credits",
              symbol: "PRK",
              decimals: 0,
              totalSupply: "10000",
              status: "ACTIVE",
            },
          },
        },
      });
      creatorId = creator.id;
      const perk = await perks.create(creatorUser.id, {
        creatorId: creator.id,
        title: "Private livestream",
        description: "Access to a creator-only livestream.",
        tokenThreshold: "100",
        inventory: 1,
        requiresWorldVerification: true,
      });
      perkId = perk.id;
      await assert.rejects(() =>
        perks.transition(perk.id, fanOne.id, "activate", 1),
      );
      await perks.transition(perk.id, creatorUser.id, "activate", 1);

      await assert.rejects(() =>
        claims.create(perk.id, fanOne.id, {
          accountId: `0.0.${accountBase + 1}`,
        }),
      );
      await assert.rejects(() =>
        new ClaimService(database, {
          async getTokenBalance() {
            return { associated: false, balance: 0n };
          },
        }).create(perk.id, fanOne.id, {}),
      );
      await assert.rejects(() =>
        new ClaimService(database, {
          async getTokenBalance() {
            return { associated: true, balance: 99n };
          },
        }).create(perk.id, fanOne.id, {}),
      );
      await assert.rejects(() => claims.create(perk.id, unverifiedFan.id, {}));

      const results = await Promise.allSettled([
        claims.create(perk.id, fanOne.id, {}),
        claims.create(perk.id, fanTwo.id, {}),
      ]);
      assert.equal(
        results.filter((result) => result.status === "fulfilled").length,
        1,
      );
      const winner = results.find(
        (
          result,
        ): result is PromiseFulfilledResult<
          Awaited<ReturnType<ClaimService["create"]>>
        > => result.status === "fulfilled",
      )?.value;
      assert.ok(winner);
      assert.equal(
        await database.claim.count({ where: { perkId: perk.id } }),
        1,
      );
      const exhausted = await database.perk.findUniqueOrThrow({
        where: { id: perk.id },
      });
      assert.equal(exhausted.status, "EXHAUSTED");
      assert.equal(exhausted.claimedCount, 1);

      const duplicate = await claims.create(perk.id, winner.claimantId, {});
      assert.equal(duplicate.id, winner.id);
      await assert.rejects(() =>
        claims.fulfill(winner.id, fanTwo.id, {
          expectedVersion: winner.version,
        }),
      );
      const fulfilled = await claims.fulfill(winner.id, creatorUser.id, {
        expectedVersion: winner.version,
        note: "Access code: STAGE-DEMO",
      });
      assert.equal(fulfilled.status, "fulfilled");

      const outbox = await database.outboxEvent.findMany({
        where: {
          eventType: { in: ["HCS_PERK_ACTIVATED", "HCS_PERK_FULFILLED"] },
          OR: [{ aggregateId: perk.id }, { aggregateId: winner.id }],
        },
      });
      assert.equal(outbox.length, 2);
      const publicMessages = JSON.stringify(
        outbox.map((event) => event.payload),
      );
      assert.equal(publicMessages.includes("accountId"), false);
      assert.equal(publicMessages.includes("STAGE-DEMO"), false);
      assert.equal(publicMessages.includes("balance"), false);
    } finally {
      if (perkId) {
        const claimIds = (
          await database.claim.findMany({
            where: { perkId },
            select: { id: true },
          })
        ).map((claim) => claim.id);
        await database.outboxEvent.deleteMany({
          where: {
            OR: [{ aggregateId: perkId }, { aggregateId: { in: claimIds } }],
          },
        });
        await database.auditEvent.deleteMany({
          where: {
            OR: [{ entityId: perkId }, { entityId: { in: claimIds } }],
          },
        });
        await database.claimRedemption.deleteMany({
          where: { claimId: { in: claimIds } },
        });
        await database.claim.deleteMany({ where: { perkId } });
        await database.perk.deleteMany({ where: { id: perkId } });
      }
      if (creatorId) {
        await database.creatorToken.deleteMany({ where: { creatorId } });
        await database.creator.deleteMany({ where: { id: creatorId } });
      }
      await database.user.deleteMany({ where: { id: { in: userIds } } });
      await database.$disconnect();
    }
  },
);
