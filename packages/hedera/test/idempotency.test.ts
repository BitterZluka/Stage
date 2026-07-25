import assert from "node:assert/strict";
import test from "node:test";
import { StageHederaError } from "../src/errors.js";
import {
  InMemoryIdempotencyStore,
  resolveIdempotency,
} from "../src/idempotency.js";
import { payloadHash } from "../src/utils.js";

const operation = "transferFungibleToken";
const payload = { tokenId: "0.0.1", amount: 25n };
const transactionId = "0.0.1001@1700000000.123456789";

async function reserve(store: InMemoryIdempotencyStore): Promise<void> {
  await store.reserve({
    key: "reward:1",
    operation,
    payloadHash: payloadHash(operation, payload),
    transactionId,
    transactionBytesBase64: "AA==",
    preparedAt: "2026-07-25T12:00:00.000Z",
  });
}

test("same idempotency key and payload replays the stored result", async () => {
  const store = new InMemoryIdempotencyStore();
  await reserve(store);
  await store.markCompleted(
    "reward:1",
    {
      transactionId,
      receiptStatus: "SUCCESS",
      explorerUrl: "https://hashscan.io/testnet/transaction/example",
      status: "success",
      mirrorVerified: true,
    },
    "2026-07-25T12:00:01.000Z",
  );
  const result = await resolveIdempotency({
    store,
    key: "reward:1",
    operation,
    payload,
  });
  assert.equal(result?.replayed, true);
  assert.equal(result?.transactionId, transactionId);
});

test("same idempotency key with changed payload conflicts", async () => {
  const store = new InMemoryIdempotencyStore();
  await reserve(store);
  await assert.rejects(
    resolveIdempotency({
      store,
      key: "reward:1",
      operation,
      payload: { ...payload, amount: 26n },
    }),
    (error: unknown) =>
      error instanceof StageHederaError &&
      error.code === "IDEMPOTENCY_CONFLICT",
  );
});

test("submitted operation blocks replacement after an ambiguous outcome", async () => {
  const store = new InMemoryIdempotencyStore();
  await reserve(store);
  await store.markSubmitted("reward:1", "2026-07-25T12:00:01.000Z");
  await assert.rejects(
    resolveIdempotency({
      store,
      key: "reward:1",
      operation,
      payload,
    }),
    (error: unknown) => {
      assert.ok(error instanceof StageHederaError);
      assert.equal(error.code, "IDEMPOTENCY_INDETERMINATE");
      assert.equal(error.transactionId, transactionId);
      return true;
    },
  );
});
