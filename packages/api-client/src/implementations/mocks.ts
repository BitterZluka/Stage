import type {
  Challenge,
  ChallengeId,
  Claim,
  ClaimId,
  ConfirmPerkPurchaseInput,
  CreatePerkPurchaseInput,
  CreateChallengeInput,
  CreateCreatorInput,
  CreatePerkInput,
  Creator,
  CreatorId,
  MutationOptions,
  OperationAccepted,
  Page,
  PageRequest,
  Perk,
  PerkId,
  PerkPurchaseId,
  PerkPurchaseIntent,
  RewardPayout,
  SubmissionId,
  UpdateChallengeInput,
  FulfillClaimInput,
  UpdatePerkInput,
  WorldProofInput,
  WorldRpContextView,
  WorldVerificationView,
} from "../contracts.js";
import {
  ChallengeStatus,
  ClaimStatus,
  PerkPurchaseStatus,
  PerkStatus,
  type HederaAccountId,
  type HederaTokenId,
  type IsoTimestamp,
  type TokenAmount,
} from "@creator-platform/shared";
import type { ChallengeService } from "../services/challenge-service.js";
import type { ClaimService } from "../services/claim-service.js";
import type { CreatorService } from "../services/creator-service.js";
import type { PerkService } from "../services/perk-service.js";
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

  async listMyChallenges(
    filters?: Partial<PageRequest> & {
      status?: Challenge["status"];
    },
  ): Promise<Page<Challenge>> {
    return pageOf(
      this.challenges.filter(
        (item) => !filters?.status || item.status === filters.status,
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

  async updateChallenge(
    id: ChallengeId,
    input: UpdateChallengeInput,
  ): Promise<Challenge> {
    const challenge = await this.getChallenge(id);
    if (!challenge) throw new Error("Challenge not found");
    return { ...challenge, ...input, version: challenge.version + 1 };
  }

  async closeChallenge(id: ChallengeId): Promise<Challenge> {
    return this.withStatus(id, ChallengeStatus.Judging);
  }

  async completeChallenge(id: ChallengeId): Promise<Challenge> {
    return this.withStatus(id, ChallengeStatus.Completed);
  }

  async cancelChallenge(id: ChallengeId): Promise<Challenge> {
    return this.withStatus(id, ChallengeStatus.Cancelled);
  }

  async deleteChallenge(
    id: ChallengeId,
    expectedVersion: number,
  ): Promise<void> {
    const index = this.challenges.findIndex((item) => item.id === id);
    const challenge = this.challenges[index];
    if (!challenge) throw new Error("Challenge not found");
    if (challenge.status !== ChallengeStatus.Draft) {
      throw new Error("Only draft challenges can be deleted");
    }
    if (challenge.version !== expectedVersion) {
      throw new Error("Challenge version conflict");
    }
    this.challenges.splice(index, 1);
  }

  private async withStatus(
    id: ChallengeId,
    status: Challenge["status"],
  ): Promise<Challenge> {
    const challenge = await this.getChallenge(id);
    if (!challenge) throw new Error("Challenge not found");
    return { ...challenge, status };
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
    _options: MutationOptions & { expectedVersion: number },
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

export class MockPerkService implements PerkService {
  constructor(private readonly perks: Perk[] = []) {}

  async listMyPerks(
    filters?: Partial<PageRequest> & {
      status?: Perk["status"];
    },
  ): Promise<Page<Perk>> {
    return pageOf(
      this.perks.filter(
        (perk) => !filters?.status || perk.status === filters.status,
      ),
      filters,
    );
  }

  async listCreatorPerks(
    creatorId: CreatorId,
    page?: Partial<PageRequest>,
  ): Promise<Page<Perk>> {
    return pageOf(
      this.perks.filter((perk) => perk.creatorId === creatorId),
      page,
    );
  }

  async getPerk(perkId: PerkId): Promise<Perk | null> {
    return this.perks.find((perk) => perk.id === perkId) ?? null;
  }

  async createPerk(input: CreatePerkInput): Promise<Perk> {
    const timestamp = new Date().toISOString() as IsoTimestamp;
    const perk = {
      ...input,
      id: `mock-perk-${this.perks.length + 1}` as PerkId,
      status: PerkStatus.Draft,
      claimedCount: 0,
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.perks.push(perk);
    return perk;
  }

  async updatePerk(perkId: PerkId, input: UpdatePerkInput): Promise<Perk> {
    const perk = await this.requirePerk(perkId);
    Object.assign(perk, input, { version: perk.version + 1 });
    return perk;
  }

  activatePerk(perkId: PerkId): Promise<Perk> {
    return this.withStatus(perkId, PerkStatus.Active);
  }

  pausePerk(perkId: PerkId): Promise<Perk> {
    return this.withStatus(perkId, PerkStatus.Paused);
  }

  resumePerk(perkId: PerkId): Promise<Perk> {
    return this.withStatus(perkId, PerkStatus.Active);
  }

  async deletePerk(perkId: PerkId, expectedVersion: number): Promise<void> {
    const index = this.perks.findIndex((perk) => perk.id === perkId);
    if (index < 0) throw new Error("Perk not found");
    const perk = this.perks[index];
    if (
      !perk ||
      perk.status !== PerkStatus.Draft ||
      perk.version !== expectedVersion
    ) {
      throw new Error("Only the current draft perk can be deleted");
    }
    this.perks.splice(index, 1);
  }

  private async requirePerk(perkId: PerkId): Promise<Perk> {
    const perk = await this.getPerk(perkId);
    if (!perk) throw new Error("Perk not found");
    return perk;
  }

  private async withStatus(perkId: PerkId, status: PerkStatus): Promise<Perk> {
    const perk = await this.requirePerk(perkId);
    perk.status = status;
    perk.version += 1;
    return perk;
  }
}

export class MockClaimService implements ClaimService {
  constructor(private readonly claims: Claim[] = []) {}

  async createPurchaseIntent(
    perkId: PerkId,
    input: CreatePerkPurchaseInput = {},
  ): Promise<PerkPurchaseIntent> {
    const now = new Date();
    return {
      id: `purchase-${perkId}` as PerkPurchaseId,
      perkId,
      status: PerkPurchaseStatus.Pending,
      accountId: input.accountId ?? ("0.0.123" as HederaAccountId),
      tokenId: "0.0.456" as HederaTokenId,
      destinationAccountId: "0.0.789",
      amount: "25" as TokenAmount,
      expiresAt: new Date(
        now.getTime() + 15 * 60_000,
      ).toISOString() as IsoTimestamp,
      createdAt: now.toISOString() as IsoTimestamp,
      updatedAt: now.toISOString() as IsoTimestamp,
    };
  }

  async confirmPurchase(
    _purchaseId: PerkPurchaseId,
    _input: ConfirmPerkPurchaseInput,
  ): Promise<Claim> {
    void _purchaseId;
    void _input;
    const existing = this.claims[0];
    if (existing) return existing;
    throw new Error("TODO: inject a deterministic claimant fixture");
  }

  async getClaim(claimId: ClaimId): Promise<Claim | null> {
    return this.claims.find((claim) => claim.id === claimId) ?? null;
  }

  async listClaims(page?: Partial<PageRequest>): Promise<Page<Claim>> {
    return pageOf(this.claims, page);
  }

  async listPerkClaims(
    perkId: PerkId,
    page?: Partial<PageRequest>,
  ): Promise<Page<Claim>> {
    return pageOf(
      this.claims.filter((claim) => claim.perkId === perkId),
      page,
    );
  }

  async fulfillClaim(
    claimId: ClaimId,
    input: FulfillClaimInput,
  ): Promise<Claim> {
    const claim = await this.getClaim(claimId);
    if (!claim) throw new Error("Claim not found");
    claim.status = ClaimStatus.Fulfilled;
    if (input.note !== undefined) claim.fulfillmentNote = input.note;
    claim.fulfilledAt = new Date().toISOString() as IsoTimestamp;
    claim.version += 1;
    return claim;
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
