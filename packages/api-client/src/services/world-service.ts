import type { WorldProofInput, WorldVerificationView } from "../contracts.js";

export interface WorldService {
  requestVerification(action: string): Promise<{
    verificationId: string;
    action: string;
    signal: string;
    expiresAt: string;
  }>;
  completeVerification(proof: WorldProofInput): Promise<WorldVerificationView>;
  getVerification(): Promise<WorldVerificationView>;
}
