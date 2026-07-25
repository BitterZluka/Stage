import type {
  StageWorldAction,
  WorldProviderName,
  WorldVerificationResult,
  WorldVerificationStatus,
} from "@stage/world/shared";

export interface AuthenticatedWorldUser {
  id: string;
  accountIds: string[];
}

export interface PersistWorldVerificationInput {
  userId: string;
  provider: WorldProviderName;
  action: StageWorldAction;
  signalHash: string;
  verification: WorldVerificationResult;
}

export interface WorldIdentityRepository {
  getStatus(userId: string): Promise<WorldVerificationStatus>;
  persistVerification(
    input: PersistWorldVerificationInput,
  ): Promise<WorldVerificationStatus>;
  assertRewardEligibility(input: {
    userId: string;
    challengeId: string;
    rewardType: string;
  }): Promise<{ worldIdentityId: string }>;
  reserveRewardClaim(input: {
    worldIdentityId: string;
    challengeId: string;
    rewardType: string;
  }): Promise<{ id: string; created: boolean }>;
}

export const WORLD_PROVIDER = Symbol("WORLD_PROVIDER");
export const WORLD_CONFIG = Symbol("WORLD_CONFIG");
export const WORLD_IDENTITY_REPOSITORY = Symbol("WORLD_IDENTITY_REPOSITORY");
