import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmPerkPurchaseSchema,
  createPerkPurchaseSchema,
  fulfillClaimSchema,
} from "./claim.schemas.js";

test("claim accepts an owned canonical Hedera account selector", () => {
  assert.equal(
    createPerkPurchaseSchema.safeParse({ accountId: "0.0.12345" }).success,
    true,
  );
  assert.equal(
    createPerkPurchaseSchema.safeParse({ accountId: "0x1234" }).success,
    false,
  );
});

test("purchase confirmation accepts native and EVM transaction references", () => {
  assert.equal(
    confirmPerkPurchaseSchema.safeParse({
      transactionReference: "0.0.12345@1784992341.091545577",
    }).success,
    true,
  );
  assert.equal(
    confirmPerkPurchaseSchema.safeParse({
      transactionReference: `0x${"12".repeat(32)}`,
    }).success,
    true,
  );
  assert.equal(
    confirmPerkPurchaseSchema.safeParse({
      transactionReference: "0x1234",
    }).success,
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
