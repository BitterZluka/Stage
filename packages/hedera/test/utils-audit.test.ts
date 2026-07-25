import assert from "node:assert/strict";
import test from "node:test";
import { StageHederaError } from "../src/errors.js";
import {
  explorerTransactionUrl,
  payloadHash,
  serializeAuditEvent,
  stableJson,
  toMirrorTransactionId,
} from "../src/utils.js";

test("canonical payload hashing supports bigint deterministically", () => {
  const left = payloadHash("mint", { z: 2n, a: { value: 1n } });
  const right = payloadHash("mint", { a: { value: 1n }, z: 2n });
  assert.equal(left, right);
  assert.equal(stableJson({ z: 2n, a: 1 }), '{"a":1,"z":{"$bigint":"2"}}');
});

test("transaction IDs are converted for Mirror Node and HashScan", () => {
  assert.equal(
    toMirrorTransactionId("0.0.123@1700000000.42"),
    "0.0.123-1700000000-000000042",
  );
  assert.equal(
    explorerTransactionUrl(
      "https://hashscan.io/testnet/",
      "0.0.123@1700000000.42",
    ),
    "https://hashscan.io/testnet/transaction/0.0.123-1700000000-000000042",
  );
});

test("HCS serialization is stable and rejects sensitive publicData keys", () => {
  const event = {
    schema: "ethglobal.audit" as const,
    version: 1 as const,
    eventId: "event-1",
    eventType: "reward_paid" as const,
    occurredAt: "2026-07-25T12:00:00.000Z",
    publicData: { transactionId: "0.0.1@1.2", amount: "2500" },
  };
  assert.equal(serializeAuditEvent(event), serializeAuditEvent({ ...event }));
  assert.throws(
    () =>
      serializeAuditEvent({
        ...event,
        publicData: { worldNullifier: "must-not-be-public" },
      }),
    (error: unknown) =>
      error instanceof StageHederaError && error.code === "INVALID_INPUT",
  );
});
