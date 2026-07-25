import type {
  WorldRpContextResponse,
  WorldVerificationStatus,
} from "../shared/index.js";

export interface WorldClient {
  createRpContext(input?: {
    hederaAccountId?: string;
  }): Promise<WorldRpContextResponse>;
  verifyProof(input: {
    proof: unknown;
    hederaAccountId?: string;
  }): Promise<WorldVerificationStatus>;
  getStatus(): Promise<WorldVerificationStatus>;
}
