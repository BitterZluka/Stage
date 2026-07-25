import type {
  Challenge,
  ChallengeId,
  CreateChallengeInput,
  CreateCreatorInput,
  Creator,
  CreatorId,
  MutationOptions,
  OperationAccepted,
  Page,
  PageRequest,
  RewardPayout,
  SubmissionId,
} from "../contracts.js";
import type { ChallengeService } from "../services/challenge-service.js";
import type { CreatorService } from "../services/creator-service.js";
import type { RewardService } from "../services/reward-service.js";

abstract class ApiServiceContract {
  constructor(protected readonly baseUrl: string) {}

  protected notImplemented(): never {
    throw new Error(
      "TODO: connect the typed HTTP transport in the frontend integration stage",
    );
  }
}

export class ApiChallengeService
  extends ApiServiceContract
  implements ChallengeService
{
  listChallenges(
    _filters?: Partial<PageRequest> & {
      creatorId?: CreatorId;
      status?: Challenge["status"];
    },
  ): Promise<Page<Challenge>> {
    void _filters;
    return this.notImplemented();
  }

  getChallenge(_id: ChallengeId): Promise<Challenge | null> {
    void _id;
    return this.notImplemented();
  }

  createChallenge(_input: CreateChallengeInput): Promise<Challenge> {
    void _input;
    return this.notImplemented();
  }

  publishChallenge(_id: ChallengeId): Promise<Challenge> {
    void _id;
    return this.notImplemented();
  }
}

export class ApiCreatorService
  extends ApiServiceContract
  implements CreatorService
{
  listCreators(_page?: Partial<PageRequest>): Promise<Page<Creator>> {
    void _page;
    return this.notImplemented();
  }

  getCreator(_id: CreatorId): Promise<Creator | null> {
    void _id;
    return this.notImplemented();
  }

  createCreator(_input: CreateCreatorInput): Promise<Creator> {
    void _input;
    return this.notImplemented();
  }

  updateCreator(
    _id: CreatorId,
    _input: Partial<Pick<Creator, "displayName" | "handle">>,
  ): Promise<Creator> {
    void _id;
    void _input;
    return this.notImplemented();
  }
}

export class ApiRewardService
  extends ApiServiceContract
  implements RewardService
{
  selectWinner(
    _submissionId: SubmissionId,
    _options: MutationOptions,
  ): Promise<OperationAccepted> {
    void _submissionId;
    void _options;
    return this.notImplemented();
  }

  getPayout(_submissionId: SubmissionId): Promise<RewardPayout | null> {
    void _submissionId;
    return this.notImplemented();
  }
}
