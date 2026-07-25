import assert from "node:assert/strict";
import { test } from "node:test";
import { completeOnboardingSchema } from "./auth.schemas.js";

test("accepts fan onboarding without creator fields", () => {
  assert.deepEqual(completeOnboardingSchema.parse({ intent: "fan" }), {
    intent: "fan",
  });
});

test("normalizes and validates creator onboarding", () => {
  assert.deepEqual(
    completeOnboardingSchema.parse({
      intent: "creator",
      handle: "Stage_Creator",
      displayName: " Stage Creator ",
    }),
    {
      intent: "creator",
      handle: "stage_creator",
      displayName: "Stage Creator",
    },
  );
  assert.equal(
    completeOnboardingSchema.safeParse({
      intent: "creator",
      handle: "no spaces",
      displayName: "Stage Creator",
    }).success,
    false,
  );
});
