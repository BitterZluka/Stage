import type {
  ChallengeId,
  ClaimId,
  CreatorId,
  CreatorTokenId,
  EntityTimestamps,
  HederaTokenId,
  IsoTimestamp,
  NftSerial,
  PerkId,
  RewardPayoutId,
  SubmissionId,
  TokenAmount,
  TransactionId,
  UserId,
} from "./primitives.js";
import type {
  ChallengeStatus,
  ClaimStatus,
  CreatorStatus,
  PayoutStatus,
  PerkStatus,
  SubmissionKind,
  SubmissionStatus,
  VerificationMode,
} from "../enums/status.js";

export interface Creator extends EntityTimestamps {
  id: CreatorId;
  handle: string;
  displayName: string;
  status: CreatorStatus;
}

export interface CreatorToken extends EntityTimestamps {
  id: CreatorTokenId;
  creatorId: CreatorId;
  hederaTokenId: HederaTokenId;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: TokenAmount;
}

export interface Challenge extends EntityTimestamps {
  id: ChallengeId;
  creatorId: CreatorId;
  title: string;
  description: string;
  status: ChallengeStatus;
  submissionKind: SubmissionKind;
  verificationMode: VerificationMode;
  requiresWorldVerification: boolean;
  participationTokenAmount: TokenAmount;
  rewardAmount: TokenAmount;
  maxWinners: number;
  winnerCount: number;
  startsAt: IsoTimestamp;
  submissionDeadline: IsoTimestamp;
  version: number;
}

export interface Submission extends EntityTimestamps {
  id: SubmissionId;
  challengeId: ChallengeId;
  authorId: UserId;
  status: SubmissionStatus;
  text?: string;
  /** Public evidence URL only; never an access-controlled or signed URL. */
  evidenceUrl?: string;
  reviewNote?: string;
  reviewedAt?: IsoTimestamp;
  version: number;
}

export interface RewardPayout {
  id: RewardPayoutId;
  challengeId: ChallengeId;
  submissionId: SubmissionId;
  recipientId: UserId;
  amount: TokenAmount;
  status: PayoutStatus;
  transactionId?: TransactionId;
  requestedAt: IsoTimestamp;
  confirmedAt?: IsoTimestamp;
}

export interface Perk extends EntityTimestamps {
  id: PerkId;
  creatorId: CreatorId;
  title: string;
  description: string;
  status: PerkStatus;
  tokenThreshold: TokenAmount;
  inventory: number;
  claimedCount: number;
  requiresWorldVerification: boolean;
  version: number;
}

export interface Claim extends EntityTimestamps {
  id: ClaimId;
  perkId: PerkId;
  claimantId: UserId;
  status: ClaimStatus;
  fulfillmentNote?: string;
  fulfilledAt?: IsoTimestamp;
  version: number;
  nftTokenId?: HederaTokenId;
  nftSerial?: NftSerial;
  mintTransactionId?: TransactionId;
  redeemTransactionId?: TransactionId;
}

// OPEN QUESTION: Decide whether challenge descriptions need immutable content hashes.
// TODO: Establish maximum lengths for user-authored public text at API boundaries.
