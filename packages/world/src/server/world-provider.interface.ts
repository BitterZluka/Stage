import type {
  StageWorldAction,
  WorldRpContext,
  WorldVerificationResult,
} from "../shared/index.js";

export interface WorldProvider {
  createRpContext(input: { action: StageWorldAction }): Promise<WorldRpContext>;

  verifyProof(input: {
    proof: unknown;
    expectedAction: StageWorldAction;
    expectedSignal: string;
  }): Promise<WorldVerificationResult>;
}
