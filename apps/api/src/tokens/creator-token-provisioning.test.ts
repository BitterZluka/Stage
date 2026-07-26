import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@creator-platform/database";
import { ensureCreatorTokenProvisioning } from "./creator-token-provisioning.js";

test("real provider login requeues a token previously confirmed by the mock worker", async () => {
  let tokenUpdate: Record<string, unknown> | undefined;
  let blockchainUpdate: Record<string, unknown> | undefined;
  let outboxUpdate: Record<string, unknown> | undefined;
  const transaction = {
    creator: {
      findUnique: async () => ({
        id: "creator-1",
        handle: "creator",
        displayName: "Creator",
      }),
    },
    creatorToken: {
      upsert: async () => ({
        id: "creator-token-1",
        creatorId: "creator-1",
        status: "ACTIVE",
        hederaTokenId: "0.0.123456789",
      }),
      update: async (query: { data: Record<string, unknown> }) => {
        tokenUpdate = query.data;
      },
    },
    blockchainTransaction: {
      findUnique: async () => ({
        hederaTransactionId: "mock-creator-token:creator-1",
      }),
      update: async (query: { data: Record<string, unknown> }) => {
        blockchainUpdate = query.data;
      },
    },
    outboxEvent: {
      upsert: async (query: { update: Record<string, unknown> }) => {
        outboxUpdate = query.update;
      },
    },
  } as unknown as Prisma.TransactionClient;

  await ensureCreatorTokenProvisioning(transaction, "creator-1", "real");

  assert.deepEqual(tokenUpdate, {
    hederaTokenId: null,
    status: "PENDING",
  });
  assert.deepEqual(blockchainUpdate, {
    status: "PENDING",
    hederaTransactionId: null,
    result: Prisma.DbNull,
    attempts: 0,
    lastErrorCode: null,
  });
  assert.equal(outboxUpdate?.status, "PENDING");
  assert.equal(outboxUpdate?.attempts, 0);
  assert.equal(outboxUpdate?.publishedAt, null);
  assert.ok(outboxUpdate?.availableAt instanceof Date);
});

test("real provider login preserves a genuinely confirmed token", async () => {
  let changed = false;
  const transaction = {
    creator: {
      findUnique: async () => ({
        id: "creator-1",
        handle: "creator",
        displayName: "Creator",
      }),
    },
    creatorToken: {
      upsert: async () => ({
        id: "creator-token-1",
        creatorId: "creator-1",
        status: "ACTIVE",
        hederaTokenId: "0.0.7654321",
      }),
      update: async () => {
        changed = true;
      },
    },
    blockchainTransaction: {
      findUnique: async () => ({
        hederaTransactionId: "0.0.123@1785024504.516760678",
      }),
      update: async () => {
        changed = true;
      },
    },
    outboxEvent: {
      upsert: async () => {
        changed = true;
      },
    },
  } as unknown as Prisma.TransactionClient;

  await ensureCreatorTokenProvisioning(transaction, "creator-1", "real");

  assert.equal(changed, false);
});

test("pending token provisioning repairs a stale outbox aggregate reference", async () => {
  let outboxUpdate: Record<string, unknown> | undefined;
  const transaction = {
    creator: {
      findUnique: async () => ({
        id: "creator-1",
        handle: "creator",
        displayName: "Creator",
      }),
    },
    creatorToken: {
      upsert: async () => ({
        id: "current-token-row",
        creatorId: "creator-1",
        status: "PENDING",
        hederaTokenId: null,
      }),
    },
    outboxEvent: {
      upsert: async (query: { update: Record<string, unknown> }) => {
        outboxUpdate = query.update;
      },
    },
  } as unknown as Prisma.TransactionClient;

  await ensureCreatorTokenProvisioning(transaction, "creator-1", "real");

  assert.equal(outboxUpdate?.aggregateId, "current-token-row");
  assert.deepEqual(outboxUpdate?.payload, {
    creatorId: "creator-1",
    creatorTokenId: "current-token-row",
  });
});
