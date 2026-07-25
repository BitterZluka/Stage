import type { StageWorldAction } from "./actions.js";

export type WorldProviderName = "real" | "fake";
export type WorldEnvironment = "production" | "staging" | "sandbox";
export type WorldProtocolVersion = "3.0" | "4.0" | "unknown";
export type WorldCredentialType = "selfie_check" | "proof_of_human" | "unknown";
export type WorldFakeScenario =
  "success" | "invalid_proof" | "duplicate" | "expired" | "unavailable";

export interface WorldRpContext {
  rp_id: `rp_${string}`;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
}

export interface WorldRpContextResponse {
  appId: `app_${string}`;
  action: StageWorldAction;
  signal: string;
  environment: WorldEnvironment;
  provider: WorldProviderName;
  rpContext: WorldRpContext;
}

export interface WorldVerificationResult {
  success: true;
  protocolVersion: WorldProtocolVersion;
  credentialType: WorldCredentialType;
  subjectKey?: string;
  replayKey: string;
  sessionId?: string;
  verifiedAt: string;
}

export interface WorldVerificationStatus {
  verified: boolean;
  credentialType?: WorldCredentialType;
  verifiedAt?: string;
  provider?: WorldProviderName;
}

export type WorldVerificationUiState =
  | "not_verified"
  | "requesting_context"
  | "opening_world"
  | "waiting_for_proof"
  | "verifying_on_backend"
  | "verified"
  | "cancelled"
  | "invalid_proof"
  | "duplicate"
  | "expired"
  | "unavailable"
  | "configuration_error";

export interface StageFakeWorldProof {
  kind: "stage_fake_world_proof";
  action: StageWorldAction;
  signal: string;
  replayKey: string;
}
