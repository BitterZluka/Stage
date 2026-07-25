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
  TokenAmount,
  UserId,
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

export interface SessionView {
  user: {
    id: UserId;
    accountIds: HederaAccountId[];
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
  rewardAmount: TokenAmount;
  submissionDeadline: IsoTimestamp;
}

export interface CreateSubmissionInput {
  challengeId: ChallengeId;
  text?: string;
  attachmentIds?: string[];
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
