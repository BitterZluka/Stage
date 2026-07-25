import type {
  WorldProofInput,
  WorldRpContextView,
  WorldVerificationView,
} from "../contracts.js";

export interface WorldService {
  requestVerification(input?: {
    hederaAccountId?: string;
  }): Promise<WorldRpContextView>;
  completeVerification(proof: WorldProofInput): Promise<WorldVerificationView>;
  getVerification(): Promise<WorldVerificationView>;
}
