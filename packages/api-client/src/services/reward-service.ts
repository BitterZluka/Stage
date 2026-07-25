import type { SubmissionId } from "@creator-platform/shared";
import type {
  MutationOptions,
  OperationAccepted,
  RewardPayout,
} from "../contracts.js";

export interface RewardService {
  selectWinner(
    submissionId: SubmissionId,
    options: MutationOptions,
  ): Promise<OperationAccepted>;
  getPayout(submissionId: SubmissionId): Promise<RewardPayout | null>;
}
