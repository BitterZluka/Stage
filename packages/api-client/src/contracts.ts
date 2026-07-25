import type {
  Challenge,
  ChallengeId,
  Claim,
  ClaimId,
  Creator,
  CreatorId,
  HederaAccountId,
  IdempotencyKey,
  IsoTimestamp,
  Page,
  PageRequest,
  Perk,
  PerkId,
  RewardPayout,
  Submission,
  SubmissionId,
  SubmissionKind,
  TokenAmount,
  UserId,
  VerificationMode,
} from "@creator-platform/shared";
import type {
  WorldRpContextResponse,
  WorldVerificationStatus,
} from "@stage/world/shared";

export type {
  Challenge,
  ChallengeId,
  Claim,
  ClaimId,
  Creator,
  CreatorId,
  Page,
  PageRequest,
  Perk,
  PerkId,
  RewardPayout,
  Submission,
  SubmissionId,
  UserId,
};

export interface OperationAccepted {
  operationId: string;
  status: "pending";
}

export type OnboardingIntent = "fan" | "creator";

export type CompleteOnboardingInput =
  | { intent: "fan" }
  | { intent: "creator"; handle: string; displayName: string };

export interface SessionView {
  user: {
    id: UserId;
    accountIds: HederaAccountId[];
    primaryIntent: OnboardingIntent | null;
    onboardingRequired: boolean;
    hasCreatorProfile: boolean;
    creatorId: CreatorId | null;
  };
  expiresAt: IsoTimestamp;
}

export interface CreateCreatorInput {
  handle: string;
  displayName: string;
  bio?: string;
}

export interface CreateChallengeInput {
  creatorId: CreatorId;
  title: string;
  description: string;
  submissionKind: SubmissionKind;
  verificationMode?: VerificationMode;
  startsAt: IsoTimestamp;
  participationRewardAmount: TokenAmount;
  rewardAmount: TokenAmount;
  maxWinners: number;
  submissionDeadline: IsoTimestamp;
  participationTokenAmount: TokenAmount;
}

export interface CreateSubmissionInput {
  challengeId: ChallengeId;
  text?: string;
  evidenceUrl?: string;
}

export interface UpdateChallengeInput {
  title?: string;
  description?: string;
  startsAt?: IsoTimestamp;
  submissionDeadline?: IsoTimestamp;
  participationRewardAmount?: TokenAmount;
  rewardAmount?: TokenAmount;
  maxWinners?: number;
  participationTokenAmount?: TokenAmount;
  expectedVersion: number;
}

export interface CreatePerkInput {
  creatorId: CreatorId;
  title: string;
  description: string;
  tokenThreshold: TokenAmount;
  inventory: number;
  requiresWorldVerification: boolean;
}

export interface UpdatePerkInput {
  title?: string;
  description?: string;
  tokenThreshold?: TokenAmount;
  inventory?: number;
  requiresWorldVerification?: boolean;
  expectedVersion: number;
}

export type SubmissionDecisionInput =
  | { decision: "accept"; expectedVersion: number }
  | {
      decision: "reject";
      expectedVersion: number;
      reasonCode: string;
      note?: string;
    };

export interface CreateClaimInput {
  accountId?: HederaAccountId;
}

export interface FulfillClaimInput {
  expectedVersion: number;
  note?: string;
}

export interface MutationOptions {
  idempotencyKey: IdempotencyKey;
}

export interface WorldProofInput {
  proof: unknown;
  hederaAccountId?: string;
}

export type WorldRpContextView = WorldRpContextResponse;
export type WorldVerificationView = WorldVerificationStatus;

// TODO: Generate transport DTOs from OpenAPI once controllers exist.
// OPEN QUESTION: Decide whether Page<T> uses a single opaque cursor or per-filter cursors.
