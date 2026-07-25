import assert from "node:assert/strict";
import test from "node:test";
import { ManualChallengeVerifier } from "./challenge-verifier.js";
import {
  createSubmissionSchema,
  submissionDecisionSchema,
} from "./submission.schemas.js";

test("submission accepts public HTTPS evidence", () => {
  const result = createSubmissionSchema.safeParse({
    evidenceUrl: "https://www.tiktok.com/@creator/video/123",
  });
  assert.equal(result.success, true);
});

test("submission blocks local and non-HTTPS evidence URLs", () => {
  assert.equal(
    createSubmissionSchema.safeParse({ evidenceUrl: "http://example.com/a" })
      .success,
    false,
  );
  assert.equal(
    createSubmissionSchema.safeParse({
      evidenceUrl: "https://127.0.0.1/private",
    }).success,
    false,
  );
});

test("rejection requires a stable reason code", () => {
  assert.equal(
    submissionDecisionSchema.safeParse({
      decision: "reject",
      expectedVersion: 1,
      reasonCode: "WRONG_SOUND",
      note: "The submitted video uses another track.",
    }).success,
    true,
  );
  assert.equal(
    submissionDecisionSchema.safeParse({
      decision: "reject",
      expectedVersion: 1,
      reasonCode: "wrong sound",
    }).success,
    false,
  );
});

test("manual verifier always routes evidence to creator review", async () => {
  const result = await new ManualChallengeVerifier().verify();
  assert.deepEqual(result, { outcome: "NEEDS_REVIEW" });
});
