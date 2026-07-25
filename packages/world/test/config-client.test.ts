import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createFakeSelfieCheckProof,
  createSelfieCheckRequest,
  worldClientErrorState,
} from "../src/client/index.js";
import { loadWorldServerConfig } from "../src/server/config.js";
import {
  STAGE_SELFIE_ENROLMENT_ACTION,
  type WorldRpContextResponse,
} from "../src/shared/index.js";

test("fake provider is rejected in production", () => {
  assert.throws(
    () =>
      loadWorldServerConfig({
        NODE_ENV: "production",
        WORLD_PROVIDER: "fake",
      }),
    /prohibited/,
  );
});

test("real provider requires an RP signing key", () => {
  assert.throws(
    () =>
      loadWorldServerConfig({
        NODE_ENV: "development",
        WORLD_PROVIDER: "real",
        WORLD_ENVIRONMENT: "staging",
        WORLD_APP_ID: "app_stage_test",
        WORLD_RP_ID: "rp_stage_test",
      }),
    /WORLD_RP_SIGNING_KEY/,
  );
});

test("client request contains only public IDKit configuration", () => {
  const context: WorldRpContextResponse = {
    appId: "app_stage_test",
    action: STAGE_SELFIE_ENROLMENT_ACTION,
    signal: `stage:v1:${"a".repeat(64)}`,
    environment: "staging",
    provider: "fake",
    rpContext: {
      rp_id: "rp_stage_test",
      nonce: "nonce",
      created_at: 1,
      expires_at: 2,
      signature: "signature",
    },
  };
  const request = createSelfieCheckRequest(context);
  assert.equal(request.preset.type, "SelfieCheckLegacy");
  assert.equal(request.preset.signal, context.signal);
  assert.equal(request.allow_legacy_proofs, true);
  assert.equal(request.require_user_presence, true);
  assert.doesNotMatch(JSON.stringify(request), /signing[_-]?key/i);

  const fakeProof = createFakeSelfieCheckProof(context);
  assert.equal(fakeProof.action, context.action);
  assert.equal(fakeProof.signal, context.signal);
});

test("client error codes map to stable UI states", () => {
  assert.equal(worldClientErrorState("user_rejected"), "cancelled");
  assert.equal(worldClientErrorState("nullifier_replayed"), "duplicate");
  assert.equal(worldClientErrorState("rp_signature_expired"), "expired");
  assert.equal(worldClientErrorState("unknown_rp"), "configuration_error");
  assert.equal(worldClientErrorState("connection_failed"), "unavailable");
});
