import assert from "node:assert/strict";
import { test } from "node:test";
import type { DatabaseService } from "../database/database.service.js";
import { CatalogService } from "./catalog.service.js";

function emptyDatabase(): DatabaseService {
  return {
    creator: { findMany: async () => [] },
    challenge: { findMany: async () => [] },
    perk: { findMany: async () => [] },
  } as unknown as DatabaseService;
}

test("catalog returns empty results when the database is empty", async () => {
  const catalog = new CatalogService(emptyDatabase());

  const challenges = await catalog.listChallenges();
  const creators = await catalog.listCreators();
  const perks = await catalog.listPerks();

  assert.deepEqual(challenges.items, []);
  assert.deepEqual(creators.items, []);
  assert.deepEqual(perks.items, []);
});

test("catalog maps a persisted challenge to its public projection", async () => {
  const databaseChallenge = {
    id: "cover-art-single",
    creatorId: "database-creator",
    creator: {
      handle: "database",
      displayName: "Database Creator",
      token: { hederaTokenId: "0.0.456" },
    },
    title: "Database title",
    description: "Authoritative persisted challenge",
    status: "PUBLISHED" as const,
    submissionKind: "LINK" as const,
    verificationMode: "AUTOMATIC" as const,
    requiresWorldVerification: false,
    rewardRule: {
      participationAmount: "25",
      amount: "999",
      maxWinners: 2,
    },
    _count: { submissions: 4, reservations: 1 },
    startsAt: new Date("2026-07-01T00:00:00.000Z"),
    submissionDeadline: new Date("2026-09-01T00:00:00.000Z"),
    createdAt: new Date("2026-07-25T00:00:00.000Z"),
  };
  const database = {
    creator: { findMany: async () => [] },
    challenge: { findMany: async () => [databaseChallenge] },
    perk: { findMany: async () => [] },
  } as unknown as DatabaseService;
  const catalog = new CatalogService(database);

  const { items } = await catalog.listChallenges();

  assert.equal(items.length, 1);
  assert.equal(items[0]?.id, "cover-art-single");
  assert.equal(items[0]?.source, "database");
  assert.equal(items[0]?.title, "Database title");
  assert.equal(items[0]?.submissionCount, 4);
  assert.equal(items[0]?.creatorTokenId, "0.0.456");
  assert.equal(items[0]?.participationRewardAmount, "25");
  assert.equal(items[0]?.rewardAmount, "999");
  assert.equal(items[0]?.maxWinners, 2);
});

test("catalog maps a persisted creator", async () => {
  const databaseCreator = {
    id: "persisted-lena",
    handle: "LenaMusic",
    displayName: "Persisted Lena",
    createdAt: new Date("2026-07-25T00:00:00.000Z"),
    token: {
      name: "Persisted Lena Token",
      symbol: "PLENA",
      hederaTokenId: "0.0.123",
    },
    challenges: [{ status: "PUBLISHED" as const }],
    perks: [{ id: "persisted-perk" }],
  };
  const database = {
    creator: { findMany: async () => [databaseCreator] },
    challenge: { findMany: async () => [] },
    perk: { findMany: async () => [] },
  } as unknown as DatabaseService;
  const catalog = new CatalogService(database);

  const { items } = await catalog.listCreators();

  assert.equal(items.length, 1);
  assert.equal(items[0]?.id, "persisted-lena");
  assert.equal(items[0]?.verified, true);
  assert.equal(items[0]?.source, "database");
});

test("perk filtering scopes the Prisma query by creator", async () => {
  let receivedWhere: unknown;
  const database = {
    creator: { findMany: async () => [] },
    challenge: { findMany: async () => [] },
    perk: {
      findMany: async (query: { where: unknown }) => {
        receivedWhere = query.where;
        return [];
      },
    },
  } as unknown as DatabaseService;
  const catalog = new CatalogService(database);

  const { items } = await catalog.listPerks("nova-wave");

  assert.deepEqual(items, []);
  assert.deepEqual(receivedWhere, {
    status: { in: ["ACTIVE", "PAUSED", "EXHAUSTED"] },
    creator: { status: "ACTIVE" },
    creatorId: "nova-wave",
  });
});

test("getCreator returns null when there is no matching creator", async () => {
  const catalog = new CatalogService(emptyDatabase());

  const missing = await catalog.getCreator("does-not-exist");

  assert.equal(missing, null);
});
