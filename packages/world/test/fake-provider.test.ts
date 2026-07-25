import assert from "node:assert/strict";
import { test } from "node:test";
import { FakeWorldProvider } from "../src/server/fake-world.provider.js";
import { WorldProviderError } from "../src/server/server-errors.js";
import {
  STAGE_SELFIE_ENROLMENT_ACTION,
  type StageFakeWorldProof,
  type WorldFakeScenario,
} from "../src/shared/index.js";

const signal = `stage:v1:${"b".repeat(64)}`;
const proof: StageFakeWorldProof = {
  kind: "stage_fake_world_proof",
  action: STAGE_SELFIE_ENROLMENT_ACTION,
  signal,
  replayKey: "fake-replay",
};

async function expectCode(
  scenario: WorldFakeScenario,
  code: WorldProviderError["code"],
): Promise<void> {
  const provider = new FakeWorldProvider({ scenario });
  await assert.rejects(
    provider.verifyProof({
      proof,
      expectedAction: STAGE_SELFIE_ENROLMENT_ACTION,
      expectedSignal: signal,
    }),
    (error: unknown) =>
      error instanceof WorldProviderError && error.code === code,
  );
}

test("fake provider returns a deterministic successful verification", async () => {
  const now = new Date("2026-07-25T12:00:00.000Z");
  const provider = new FakeWorldProvider({
    scenario: "success",
    now: () => now,
  });
  const result = await provider.verifyProof({
    proof,
    expectedAction: STAGE_SELFIE_ENROLMENT_ACTION,
    expectedSignal: signal,
  });
  assert.equal(result.replayKey, "fake-replay");
  assert.equal(result.credentialType, "selfie_check");
  assert.equal(result.verifiedAt, now.toISOString());
});

test("fake provider supports explicit failure scenarios", async () => {
  await expectCode("invalid_proof", "PROOF_INVALID");
  await expectCode("duplicate", "PROOF_REPLAYED");
  await expectCode("expired", "PROOF_EXPIRED");
  await expectCode("unavailable", "SELFIE_CHECK_UNAVAILABLE");
});

test("fake provider rejects mismatched action and signal", async () => {
  const provider = new FakeWorldProvider();
  await assert.rejects(
    provider.verifyProof({
      proof: { ...proof, action: "wrong" },
      expectedAction: STAGE_SELFIE_ENROLMENT_ACTION,
      expectedSignal: signal,
    }),
    (error: unknown) =>
      error instanceof WorldProviderError && error.code === "ACTION_MISMATCH",
  );
  await assert.rejects(
    provider.verifyProof({
      proof: { ...proof, signal: "wrong" },
      expectedAction: STAGE_SELFIE_ENROLMENT_ACTION,
      expectedSignal: signal,
    }),
    (error: unknown) =>
      error instanceof WorldProviderError && error.code === "SIGNAL_MISMATCH",
  );
});
