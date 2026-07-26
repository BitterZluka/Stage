import assert from "node:assert/strict";
import test from "node:test";
import {
  createPerkSchema,
  deletePerkSchema,
  listOwnedPerksSchema,
} from "./perk.schemas.js";
import { perkTransitionTarget } from "./perk.service.js";

test("perk creation accepts a finite positive token gate", () => {
  assert.equal(
    createPerkSchema.safeParse({
      creatorId: "5f0f2e7f-dfc1-49c4-b417-b43c665b20db",
      title: "Private livestream",
      description: "Access to a creator-only livestream.",
      tokenThreshold: "100",
      inventory: 25,
      requiresWorldVerification: true,
    }).success,
    true,
  );
});

test("perk creation rejects zero threshold and inventory", () => {
  assert.equal(
    createPerkSchema.safeParse({
      creatorId: "5f0f2e7f-dfc1-49c4-b417-b43c665b20db",
      title: "Private livestream",
      description: "Access to a creator-only livestream.",
      tokenThreshold: "0",
      inventory: 0,
      requiresWorldVerification: true,
    }).success,
    false,
  );
});

test("perk lifecycle permits only explicit transitions", () => {
  assert.equal(perkTransitionTarget("DRAFT", "activate"), "ACTIVE");
  assert.equal(perkTransitionTarget("ACTIVE", "pause"), "PAUSED");
  assert.equal(perkTransitionTarget("PAUSED", "resume"), "ACTIVE");
  assert.equal(perkTransitionTarget("EXHAUSTED", "resume"), null);
  assert.equal(perkTransitionTarget("DRAFT", "pause"), null);
});

test("creator perk list accepts private lifecycle states", () => {
  assert.deepEqual(
    listOwnedPerksSchema.parse({ status: "draft", limit: "50" }),
    {
      status: "draft",
      limit: 50,
    },
  );
  assert.equal(
    listOwnedPerksSchema.safeParse({ status: "archived" }).success,
    false,
  );
});

test("draft deletion requires an optimistic concurrency version", () => {
  assert.deepEqual(deletePerkSchema.parse({ expectedVersion: 2 }), {
    expectedVersion: 2,
  });
  assert.equal(
    deletePerkSchema.safeParse({ expectedVersion: 0 }).success,
    false,
  );
});
