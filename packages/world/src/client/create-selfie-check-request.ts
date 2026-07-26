import type {
  StageFakeWorldProof,
  WorldEnvironment,
  WorldRpContext,
  WorldRpContextResponse,
} from "../shared/index.js";

export interface SelfieCheckRequestConfig {
  app_id: `app_${string}`;
  action: string;
  rp_context: WorldRpContext;
  allow_legacy_proofs: true;
  environment: WorldEnvironment;
  preset: {
    type: "SelfieCheckLegacy";
    signal: string;
  };
}

export function createSelfieCheckRequest(
  context: WorldRpContextResponse,
): SelfieCheckRequestConfig {
  return {
    app_id: context.appId,
    action: context.action,
    rp_context: context.rpContext,
    allow_legacy_proofs: true,
    environment: context.environment,
    preset: {
      type: "SelfieCheckLegacy",
      signal: context.signal,
    },
  };
}

export function createFakeSelfieCheckProof(
  context: WorldRpContextResponse,
): StageFakeWorldProof {
  return {
    kind: "stage_fake_world_proof",
    action: context.action,
    signal: context.signal,
    replayKey: `fake:${context.action}:${context.signal}`,
  };
}
