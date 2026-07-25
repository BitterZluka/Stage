import type {
  Challenge,
  ChallengeId,
  CreateChallengeInput,
  CreatorId,
  Page,
  PageRequest,
} from "../contracts.js";

export interface ChallengeService {
  listChallenges(
    filters?: Partial<PageRequest> & {
      creatorId?: CreatorId;
      status?: Challenge["status"];
    },
  ): Promise<Page<Challenge>>;
  getChallenge(challengeId: ChallengeId): Promise<Challenge | null>;
  createChallenge(input: CreateChallengeInput): Promise<Challenge>;
  publishChallenge(challengeId: ChallengeId): Promise<Challenge>;
}
