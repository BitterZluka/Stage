import type {
  ChallengeId,
  CreateSubmissionInput,
  Page,
  PageRequest,
  Submission,
  SubmissionDecisionInput,
  SubmissionId,
} from "../contracts.js";

export interface SubmissionService {
  createSubmission(input: CreateSubmissionInput): Promise<Submission>;
  getSubmission(submissionId: SubmissionId): Promise<Submission | null>;
  listChallengeSubmissions(
    challengeId: ChallengeId,
    page?: Partial<PageRequest>,
  ): Promise<Page<Submission>>;
  decideSubmission(
    submissionId: SubmissionId,
    input: SubmissionDecisionInput,
  ): Promise<{ submission: Submission; payout: unknown | null }>;
}
