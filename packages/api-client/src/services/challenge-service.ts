import type {
  Challenge,
  ChallengeId,
  CreateChallengeInput,
  CreatorId,
  Page,
  PageRequest,
  UpdateChallengeInput,
} from "../contracts.js";

export interface ChallengeService {
  listChallenges(
    filters?: Partial<PageRequest> & {
      creatorId?: CreatorId;
      status?: Challenge["status"];
    },
  ): Promise<Page<Challenge>>;
  listMyChallenges(
    filters?: Partial<PageRequest> & {
      status?: Challenge["status"];
    },
  ): Promise<Page<Challenge>>;
  getChallenge(challengeId: ChallengeId): Promise<Challenge | null>;
  createChallenge(input: CreateChallengeInput): Promise<Challenge>;
  updateChallenge(
    challengeId: ChallengeId,
    input: UpdateChallengeInput,
  ): Promise<Challenge>;
  publishChallenge(challengeId: ChallengeId): Promise<Challenge>;
  closeChallenge(challengeId: ChallengeId): Promise<Challenge>;
  completeChallenge(challengeId: ChallengeId): Promise<Challenge>;
  cancelChallenge(challengeId: ChallengeId): Promise<Challenge>;
  deleteChallenge(
    challengeId: ChallengeId,
    expectedVersion: number,
  ): Promise<void>;
}
