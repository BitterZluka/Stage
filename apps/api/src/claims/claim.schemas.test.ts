import assert from "node:assert/strict";
import test from "node:test";
import { createClaimSchema, fulfillClaimSchema } from "./claim.schemas.js";

test("claim accepts an owned canonical Hedera account selector", () => {
  assert.equal(
    createClaimSchema.safeParse({ accountId: "0.0.12345" }).success,
    true,
  );
  assert.equal(
    createClaimSchema.safeParse({ accountId: "0x1234" }).success,
    false,
  );
});

test("manual fulfillment bounds private creator notes", () => {
  assert.equal(
    fulfillClaimSchema.safeParse({
      expectedVersion: 1,
      note: "Access code: STAGE-DEMO",
    }).success,
    true,
  );
  assert.equal(
    fulfillClaimSchema.safeParse({
      expectedVersion: 1,
      note: "x".repeat(1_001),
    }).success,
    false,
  );
});
