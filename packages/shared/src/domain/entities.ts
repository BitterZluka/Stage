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
  SubmissionStatus,
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
  rewardAmount: TokenAmount;
  submissionDeadline: IsoTimestamp;
}

export interface Submission extends EntityTimestamps {
  id: SubmissionId;
  challengeId: ChallengeId;
  authorId: UserId;
  status: SubmissionStatus;
  /** Public storage reference only; never an access-controlled or signed URL. */
  publicArtifactRef: string;
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
  price: TokenAmount;
  supply: string;
}

export interface Claim extends EntityTimestamps {
  id: ClaimId;
  perkId: PerkId;
  claimantId: UserId;
  status: ClaimStatus;
  nftTokenId?: HederaTokenId;
  nftSerial?: NftSerial;
  mintTransactionId?: TransactionId;
  redeemTransactionId?: TransactionId;
}

// OPEN QUESTION: Decide whether challenge descriptions need immutable content hashes.
// TODO: Establish maximum lengths for user-authored public text at API boundaries.
