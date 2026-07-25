import assert from "node:assert/strict";
import { test } from "node:test";
import { hashSignal } from "@worldcoin/idkit-core/hashing";
import type { WorldServerConfig } from "../src/server/config.js";
import { RealWorldProvider } from "../src/server/real-world.provider.js";
import { WorldProviderError } from "../src/server/server-errors.js";
import { STAGE_SELFIE_ENROLMENT_ACTION } from "../src/shared/index.js";

const signal = `stage:v1:${"c".repeat(64)}`;
const proof = {
  protocol_version: "3.0",
  nonce: "nonce",
  action: STAGE_SELFIE_ENROLMENT_ACTION,
  responses: [
    {
      identifier: "selfie",
      signal_hash: hashSignal(signal),
      proof: "0xproof",
      merkle_root: "0xroot",
      nullifier: "0x00ABCDEF",
    },
  ],
  user_presence_completed: true,
  environment: "staging",
};

const config: WorldServerConfig = {
  provider: "real",
  environment: "staging",
  appId: "app_stage_test",
  rpId: "rp_stage_test",
  action: STAGE_SELFIE_ENROLMENT_ACTION,
  verifyBaseUrl: "https://developer.world.org",
  rpSigningKey: "1".padStart(64, "0"),
  fakeScenario: "success",
  rpContextTtlSeconds: 300,
};

test("real provider creates a signed RP context without exposing the key", async () => {
  const provider = new RealWorldProvider(config);
  const context = await provider.createRpContext({
    action: STAGE_SELFIE_ENROLMENT_ACTION,
  });
  assert.equal(context.rp_id, config.rpId);
  assert.ok(context.signature.startsWith("0x"));
  assert.ok(context.expires_at > context.created_at);
  assert.doesNotMatch(
    JSON.stringify(context),
    new RegExp(config.rpSigningKey!),
  );
});

test("real provider forwards the original IDKit proof and normalizes success", async () => {
  let forwardedBody = "";
  const provider = new RealWorldProvider(config, async (_url, init) => {
    forwardedBody = String(init?.body);
    return new Response(
      JSON.stringify({
        success: true,
        action: STAGE_SELFIE_ENROLMENT_ACTION,
        nullifier: "0x000abcdef",
        created_at: "2026-07-25T12:00:00.000Z",
        results: [
          { identifier: "selfie", success: true, nullifier: "0xabcdef" },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
  const result = await provider.verifyProof({
    proof,
    expectedAction: STAGE_SELFIE_ENROLMENT_ACTION,
    expectedSignal: signal,
  });
  assert.equal(forwardedBody, JSON.stringify(proof));
  assert.equal(result.protocolVersion, "3.0");
  assert.equal(result.credentialType, "selfie_check");
  assert.equal(result.replayKey, "0xabcdef");
});

test("real provider normalizes a successful v4 proof", async () => {
  const v4Proof = {
    ...proof,
    protocol_version: "4.0",
    session_id: "session-v4",
    responses: [
      {
        identifier: "selfie",
        signal_hash: hashSignal(signal),
        proof: ["0xproof"],
        nullifier: "0xV4NULLIFIER",
      },
    ],
  };
  const provider = new RealWorldProvider(config, async () => {
    return new Response(
      JSON.stringify({
        success: true,
        action: STAGE_SELFIE_ENROLMENT_ACTION,
        nullifier: "0xv4nullifier",
        session_id: "session-v4",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const result = await provider.verifyProof({
    proof: v4Proof,
    expectedAction: STAGE_SELFIE_ENROLMENT_ACTION,
    expectedSignal: signal,
  });

  assert.equal(result.protocolVersion, "4.0");
  assert.equal(result.credentialType, "selfie_check");
  assert.equal(result.replayKey, "0xv4nullifier");
  assert.equal(result.sessionId, "session-v4");
});

test("real provider rejects mismatched expected action and signal before fetch", async () => {
  const provider = new RealWorldProvider(config, async () => {
    throw new Error("fetch should not run");
  });
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
      proof,
      expectedAction: STAGE_SELFIE_ENROLMENT_ACTION,
      expectedSignal: "stage:v1:wrong",
    }),
    (error: unknown) =>
      error instanceof WorldProviderError && error.code === "SIGNAL_MISMATCH",
  );
});
