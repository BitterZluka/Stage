import type {
  ChallengeId,
  CreateSubmissionInput,
  Page,
  PageRequest,
  Submission,
  SubmissionId,
} from "../contracts.js";

export interface SubmissionService {
  createSubmission(input: CreateSubmissionInput): Promise<Submission>;
  getSubmission(submissionId: SubmissionId): Promise<Submission | null>;
  listChallengeSubmissions(
    challengeId: ChallengeId,
    page?: Partial<PageRequest>,
  ): Promise<Page<Submission>>;
}
