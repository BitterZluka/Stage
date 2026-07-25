import type {
  ChallengeId,
  ClaimId,
  CreatorId,
  CreatorTokenId,
  DomainEventId,
  HederaTokenId,
  IdempotencyKey,
  IsoTimestamp,
  NftSerial,
  PerkId,
  RewardPayoutId,
  SubmissionId,
  TokenAmount,
  TransactionId,
  UserId,
} from "../domain/primitives.js";

/**
 * Persisted domain-event envelope. `actorId` is DB-only and must be removed
 * when producing an HCS-safe projection.
 */
export interface EventEnvelope<Name extends string, EntityId, Payload> {
  eventId: DomainEventId;
  eventName: Name;
  version: 1;
  occurredAt: IsoTimestamp;
  entityId: EntityId;
  actorId: UserId | "system";
  idempotencyKey: IdempotencyKey;
  payload: Payload;
}

export type CreatorCreated = EventEnvelope<
  "CreatorCreated",
  CreatorId,
  { creatorId: CreatorId; handle: string }
>;
export type CreatorTokenCreated = EventEnvelope<
  "CreatorTokenCreated",
  CreatorTokenId,
  {
    creatorId: CreatorId;
    creatorTokenId: CreatorTokenId;
    hederaTokenId: HederaTokenId;
  }
>;
export type ChallengePublished = EventEnvelope<
  "ChallengePublished",
  ChallengeId,
  {
    challengeId: ChallengeId;
    creatorId: CreatorId;
    participationRewardAmount: TokenAmount;
    rewardAmount: TokenAmount;
  }
>;
export type SubmissionCreated = EventEnvelope<
  "SubmissionCreated",
  SubmissionId,
  { submissionId: SubmissionId; challengeId: ChallengeId; authorId: UserId }
>;
export type WinnerSelected = EventEnvelope<
  "WinnerSelected",
  SubmissionId,
  { challengeId: ChallengeId; submissionId: SubmissionId; winnerId: UserId }
>;
export type RewardPayoutRequested = EventEnvelope<
  "RewardPayoutRequested",
  RewardPayoutId,
  {
    payoutId: RewardPayoutId;
    challengeId: ChallengeId;
    submissionId: SubmissionId;
    recipientId: UserId;
    rewardType: "participation" | "winner";
    amount: TokenAmount;
  }
>;
export type RewardPayoutConfirmed = EventEnvelope<
  "RewardPayoutConfirmed",
  RewardPayoutId,
  {
    payoutId: RewardPayoutId;
    challengeId: ChallengeId;
    submissionId: SubmissionId;
    transactionId: TransactionId;
  }
>;
export type PerkCreated = EventEnvelope<
  "PerkCreated",
  PerkId,
  { perkId: PerkId; creatorId: CreatorId; price: TokenAmount }
>;
export type ClaimMintRequested = EventEnvelope<
  "ClaimMintRequested",
  ClaimId,
  { claimId: ClaimId; perkId: PerkId; claimantId: UserId }
>;
export type ClaimMinted = EventEnvelope<
  "ClaimMinted",
  ClaimId,
  {
    claimId: ClaimId;
    nftTokenId: HederaTokenId;
    nftSerial: NftSerial;
    transactionId: TransactionId;
  }
>;
export type ClaimRedeemRequested = EventEnvelope<
  "ClaimRedeemRequested",
  ClaimId,
  { claimId: ClaimId; claimantId: UserId }
>;
export type ClaimRedeemed = EventEnvelope<
  "ClaimRedeemed",
  ClaimId,
  { claimId: ClaimId; transactionId: TransactionId }
>;

export type DomainEvent =
  | CreatorCreated
  | CreatorTokenCreated
  | ChallengePublished
  | SubmissionCreated
  | WinnerSelected
  | RewardPayoutRequested
  | RewardPayoutConfirmed
  | PerkCreated
  | ClaimMintRequested
  | ClaimMinted
  | ClaimRedeemRequested
  | ClaimRedeemed;
