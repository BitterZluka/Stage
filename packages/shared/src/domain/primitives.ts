export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

declare const brand: unique symbol;
export type Brand<T, Name extends string> = T & { readonly [brand]: Name };

export type CreatorId = Brand<string, "CreatorId">;
export type CreatorTokenId = Brand<string, "CreatorTokenId">;
export type WalletId = Brand<string, "WalletId">;
export type ChallengeId = Brand<string, "ChallengeId">;
export type SubmissionId = Brand<string, "SubmissionId">;
export type RewardRuleId = Brand<string, "RewardRuleId">;
export type RewardReservationId = Brand<string, "RewardReservationId">;
export type RewardPayoutId = Brand<string, "RewardPayoutId">;
export type WorldVerificationId = Brand<string, "WorldVerificationId">;
export type PerkId = Brand<string, "PerkId">;
export type ClaimId = Brand<string, "ClaimId">;
export type ClaimRedemptionId = Brand<string, "ClaimRedemptionId">;
export type UserId = Brand<string, "UserId">;
export type JobId = Brand<string, "JobId">;
export type FileId = Brand<string, "FileId">;
export type TransactionId = Brand<string, "TransactionId">;
export type HederaTokenId = Brand<string, "HederaTokenId">;
export type HederaAccountId = Brand<string, "HederaAccountId">;
export type EvmAddress = Brand<string, "EvmAddress">;
export type NftSerial = Brand<string, "NftSerial">;
export type DomainEventId = Brand<string, "DomainEventId">;
export type AuditEventId = Brand<string, "AuditEventId">;
export type BlockchainTransactionId = Brand<string, "BlockchainTransactionId">;
export type OutboxEventId = Brand<string, "OutboxEventId">;
export type IdempotencyKey = Brand<string, "IdempotencyKey">;

/** UTC ISO-8601 timestamp, validated at system boundaries. */
export type IsoTimestamp = Brand<string, "IsoTimestamp">;
/** Non-negative base-10 integer string in the token's smallest unit. */
export type TokenAmount = Brand<string, "TokenAmount">;

export interface OperationMetadata {
  idempotencyKey: IdempotencyKey;
  correlationId: string;
  requestedAt: IsoTimestamp;
  signer: "treasury" | "operator" | "user";
  retry: {
    attempt: number;
    maxAttempts: number;
  };
}

export interface EntityTimestamps {
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
