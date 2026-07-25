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
  WorldProofInput,
  WorldRpContextView,
  WorldVerificationView,
} from "../contracts.js";
import type { ChallengeService } from "../services/challenge-service.js";
import type { CreatorService } from "../services/creator-service.js";
import type { RewardService } from "../services/reward-service.js";
import type { WorldService } from "../services/world-service.js";
import { STAGE_SELFIE_ENROLMENT_ACTION } from "@stage/world/shared";

const pageOf = <T>(items: T[], page?: Partial<PageRequest>): Page<T> => ({
  items: items.slice(0, page?.limit ?? 20),
  pageInfo: { hasNextPage: false },
});

export class MockChallengeService implements ChallengeService {
  constructor(private readonly challenges: Challenge[] = []) {}

  async listChallenges(
    filters?: Partial<PageRequest> & {
      creatorId?: CreatorId;
      status?: Challenge["status"];
    },
  ): Promise<Page<Challenge>> {
    return pageOf(
      this.challenges.filter(
        (item) =>
          (!filters?.creatorId || item.creatorId === filters.creatorId) &&
          (!filters?.status || item.status === filters.status),
      ),
      filters,
    );
  }

  async getChallenge(id: ChallengeId): Promise<Challenge | null> {
    return this.challenges.find((item) => item.id === id) ?? null;
  }

  async createChallenge(_input: CreateChallengeInput): Promise<Challenge> {
    void _input;
    throw new Error("TODO: inject a deterministic challenge fixture factory");
  }

  async publishChallenge(id: ChallengeId): Promise<Challenge> {
    const challenge = await this.getChallenge(id);
    if (!challenge) throw new Error("Challenge not found");
    return { ...challenge, status: "published" as Challenge["status"] };
  }
}

export class MockCreatorService implements CreatorService {
  constructor(private readonly creators: Creator[] = []) {}

  async listCreators(page?: Partial<PageRequest>): Promise<Page<Creator>> {
    return pageOf(this.creators, page);
  }

  async getCreator(id: CreatorId): Promise<Creator | null> {
    return this.creators.find((item) => item.id === id) ?? null;
  }

  async createCreator(_input: CreateCreatorInput): Promise<Creator> {
    void _input;
    throw new Error("TODO: inject a deterministic creator fixture factory");
  }

  async updateCreator(
    id: CreatorId,
    input: Partial<Pick<Creator, "displayName" | "handle">>,
  ): Promise<Creator> {
    const creator = await this.getCreator(id);
    if (!creator) throw new Error("Creator not found");
    return { ...creator, ...input };
  }
}

export class MockRewardService implements RewardService {
  constructor(private readonly payouts: RewardPayout[] = []) {}

  async selectWinner(
    submissionId: SubmissionId,
    _options: MutationOptions,
  ): Promise<OperationAccepted> {
    void _options;
    return { operationId: `mock-reward-${submissionId}`, status: "pending" };
  }

  async getPayout(submissionId: SubmissionId): Promise<RewardPayout | null> {
    return (
      this.payouts.find((item) => item.submissionId === submissionId) ?? null
    );
  }
}

export class MockWorldService implements WorldService {
  private status: WorldVerificationView = {
    verified: false,
    provider: "fake",
  };

  async requestVerification(): Promise<WorldRpContextView> {
    return {
      appId: "app_fake_stage",
      action: STAGE_SELFIE_ENROLMENT_ACTION,
      signal: `stage:v1:${"0".repeat(64)}`,
      environment: "staging",
      provider: "fake",
      rpContext: {
        rp_id: "rp_fake_stage",
        nonce: "mock-nonce",
        created_at: 1,
        expires_at: 301,
        signature: "mock-signature",
      },
    };
  }

  async completeVerification(
    _proof: WorldProofInput,
  ): Promise<WorldVerificationView> {
    void _proof;
    this.status = {
      verified: true,
      credentialType: "selfie_check",
      verifiedAt: "2026-07-25T12:00:00.000Z",
      provider: "fake",
    };
    return this.status;
  }

  async getVerification(): Promise<WorldVerificationView> {
    return this.status;
  }
}
