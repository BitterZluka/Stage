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

test("catalog returns rich demo fixtures in a stable order", async () => {
  const catalog = new CatalogService(emptyDatabase());

  const first = await catalog.listChallenges();
  const second = await catalog.listChallenges();
  const creators = await catalog.listCreators();
  const perks = await catalog.listPerks();

  assert.deepEqual(first, second);
  assert.ok(first.items.length >= 10);
  assert.ok(creators.items.length >= 9);
  assert.ok(perks.items.length >= 12);
  assert.equal(first.items[0]?.featured, true);
  assert.equal(creators.items[0]?.featured, true);
  assert.equal(perks.items[0]?.featured, true);
  assert.ok(first.items.every(({ source }) => source === "demo"));
});

test("database records replace colliding demo records", async () => {
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
  const collisions = items.filter(({ id }) => id === "cover-art-single");

  assert.equal(collisions.length, 1);
  assert.equal(collisions[0]?.source, "database");
  assert.equal(collisions[0]?.title, "Database title");
  assert.equal(collisions[0]?.submissionCount, 4);
  assert.equal(collisions[0]?.creatorTokenId, "0.0.456");
  assert.equal(collisions[0]?.participationRewardAmount, "25");
});

test("creator handles dedupe case-insensitively in favor of Prisma", async () => {
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
  const matching = items.filter(
    ({ handle }) => handle.toLowerCase() === "lenamusic",
  );

  assert.equal(matching.length, 1);
  assert.equal(matching[0]?.id, "persisted-lena");
  assert.equal(matching[0]?.verified, true);
});

test("perk filtering applies to Prisma and demo fixtures", async () => {
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

  assert.deepEqual(
    items.map(({ creatorId }) => creatorId),
    ["nova-wave", "nova-wave"],
  );
  assert.deepEqual(receivedWhere, {
    status: { in: ["ACTIVE", "PAUSED", "EXHAUSTED"] },
    creator: { status: "ACTIVE" },
    creatorId: "nova-wave",
  });
});

test("creator profiles combine the creator's challenges and perks", async () => {
  const catalog = new CatalogService(emptyDatabase());

  const profile = await catalog.getCreator("LenaMusic");
  const missing = await catalog.getCreator("does-not-exist");

  assert.equal(profile?.creator.id, "lena-music");
  assert.ok((profile?.challenges.length ?? 0) >= 2);
  assert.ok((profile?.perks.length ?? 0) >= 3);
  assert.equal(missing, null);
});
