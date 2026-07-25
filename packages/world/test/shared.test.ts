import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STAGE_SELFIE_ENROLMENT_ACTION,
  asStageWorldAction,
  buildStageWorldSignal,
  canonicalStageWorldSignalPayload,
} from "../src/shared/index.js";

test("Stage World signal is canonical, deterministic, and hides source IDs", () => {
  const input = { userId: "user-123", hederaAccountId: "0.0.456" };
  assert.equal(
    canonicalStageWorldSignalPayload(input),
    '{"hederaAccountId":"0.0.456","userId":"user-123"}',
  );
  const first = buildStageWorldSignal(input);
  assert.equal(first, buildStageWorldSignal(input));
  assert.match(first, /^stage:v1:[0-9a-f]{64}$/);
  assert.doesNotMatch(first, /user-123|0\.0\.456/);
});

test("only the stable Stage enrolment action is allowed", () => {
  assert.equal(
    asStageWorldAction(STAGE_SELFIE_ENROLMENT_ACTION),
    STAGE_SELFIE_ENROLMENT_ACTION,
  );
  assert.throws(() => asStageWorldAction("challenge-123"), /not allowed/);
});
