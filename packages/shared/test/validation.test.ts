import assert from "node:assert/strict";
import { test } from "node:test";
import {
  asIdempotencyKey,
  asIsoTimestamp,
  asTokenAmount,
  assertHcsSafePublicData,
} from "../src/index.js";

test("asTokenAmount accepts canonical non-negative integer strings", () => {
  assert.equal(asTokenAmount("0"), "0");
  assert.equal(asTokenAmount("1"), "1");
  assert.equal(asTokenAmount("999999999999999999999999"), "999999999999999999999999");
});

test("asTokenAmount rejects ambiguous or unsafe token amounts", () => {
  for (const value of ["", "01", "-1", "1.5", "1e3", " 1", "+1"]) {
    assert.throws(() => asTokenAmount(value), TypeError);
  }
});

test("asIdempotencyKey enforces the stable boundary format", () => {
  assert.equal(asIdempotencyKey("reward:user-1:challenge-1"), "reward:user-1:challenge-1");
  for (const value of [
    "short",
    "contains spaces",
    "contains/slash",
    "x".repeat(129),
  ]) {
    assert.throws(() => asIdempotencyKey(value), TypeError);
  }
});

test("asIsoTimestamp accepts ISO timestamps and rejects non-ISO values", () => {
  const value = "2026-07-25T12:00:00.000Z";
  assert.equal(asIsoTimestamp(value), value);
  for (const invalid of ["2026-07-25", "not-a-date", "25/07/2026"]) {
    assert.throws(() => asIsoTimestamp(invalid), TypeError);
  }
});

test("assertHcsSafePublicData accepts public identifiers and facts", () => {
  assert.doesNotThrow(() =>
    assertHcsSafePublicData({
      challengeId: "challenge-1",
      reward: { type: "creator_credit", amount: "10" },
      transactionIds: ["tx-1", "tx-2"],
    }),
  );
});

test("assertHcsSafePublicData recursively rejects private fields", () => {
  for (const publicData of [
    { email: "fan@example.com" },
    { user: { phone_number: "+10000000000" } },
    { world: [{ nullifier_hash: "secret" }] },
    { verification: { proof: "secret" } },
    { asset: { signedUrl: "https://private.example" } },
  ]) {
    assert.throws(
      () => assertHcsSafePublicData(publicData),
      /Forbidden HCS field/,
    );
  }
});
