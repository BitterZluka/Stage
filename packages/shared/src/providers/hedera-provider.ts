import type {
  HederaAccountId,
  HederaTokenId,
  IsoTimestamp,
  NftSerial,
  OperationMetadata,
  TokenAmount,
  TransactionId,
} from "../domain/primitives.js";
import type { TransactionStatus } from "../enums/status.js";
import type { HcsSafeAuditPayload } from "../events/audit.js";

export interface HederaTransactionResult {
  transactionId: TransactionId;
  status: TransactionStatus;
}

export interface CreateCreatorTokenInput {
  operation: OperationMetadata;
  treasuryAccountId: HederaAccountId;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: TokenAmount;
}

export interface CreateCreatorTokenResult extends HederaTransactionResult {
  tokenId: HederaTokenId;
}

export interface CreditMintInput {
  operation: OperationMetadata;
  tokenId: HederaTokenId;
  amount: TokenAmount;
}

export interface CreditTransferInput {
  operation: OperationMetadata;
  tokenId: HederaTokenId;
  fromAccountId: HederaAccountId;
  toAccountId: HederaAccountId;
  amount: TokenAmount;
}

export interface CreateClaimNftCollectionInput {
  operation: OperationMetadata;
  treasuryAccountId: HederaAccountId;
  name: string;
  symbol: string;
  maxSupply?: string;
}

export interface CreateClaimNftCollectionResult extends HederaTransactionResult {
  tokenId: HederaTokenId;
}

export interface MintNftInput {
  operation: OperationMetadata;
  tokenId: HederaTokenId;
  /** UTF-8 JSON or content identifier encoded as base64; no private URL or PII. */
  metadataBase64: string;
}

export interface MintNftResult extends HederaTransactionResult {
  serial: NftSerial;
}

export interface NftTransferInput {
  operation: OperationMetadata;
  tokenId: HederaTokenId;
  serial: NftSerial;
  fromAccountId: HederaAccountId;
  toAccountId: HederaAccountId;
}

export interface BurnNftInput {
  operation: OperationMetadata;
  tokenId: HederaTokenId;
  serial: NftSerial;
}

export interface HcsAuditMessageInput {
  operation: OperationMetadata;
  topicId: string;
  payload: HcsSafeAuditPayload;
}

export interface HcsAuditMessageResult extends HederaTransactionResult {
  sequenceNumber?: string;
  consensusTimestamp?: IsoTimestamp;
}

export interface HederaReadMetadata {
  correlationId: string;
  requestedAt: IsoTimestamp;
}

export type HederaProviderErrorCode =
  | "INVALID_INPUT"
  | "IDEMPOTENCY_CONFLICT"
  | "TOKEN_NOT_ASSOCIATED"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_SIGNATURE"
  | "TRANSACTION_REJECTED"
  | "TRANSACTION_OUTCOME_UNKNOWN"
  | "MIRROR_NODE_UNAVAILABLE"
  | "HEDERA_UNAVAILABLE";

export interface HederaOperationPolicy {
  signer: "operator" | "treasury" | "user" | "none";
  retryable: boolean;
  idempotencyRequired: boolean;
  possibleErrors: readonly HederaProviderErrorCode[];
}

/**
 * Reviewable policy metadata for orchestration and documentation. Runtime
 * adapters still classify concrete SDK statuses into these stable errors.
 */
export const HEDERA_OPERATION_POLICIES = {
  createCreatorToken: {
    signer: "operator",
    retryable: true,
    idempotencyRequired: true,
    possibleErrors: ["INVALID_INPUT", "IDEMPOTENCY_CONFLICT", "TRANSACTION_OUTCOME_UNKNOWN"],
  },
  mintCredits: {
    signer: "operator",
    retryable: true,
    idempotencyRequired: true,
    possibleErrors: ["IDEMPOTENCY_CONFLICT", "TRANSACTION_REJECTED"],
  },
  transferCredits: {
    signer: "treasury",
    retryable: true,
    idempotencyRequired: true,
    possibleErrors: ["TOKEN_NOT_ASSOCIATED", "INSUFFICIENT_BALANCE", "TRANSACTION_OUTCOME_UNKNOWN"],
  },
  createClaimNftCollection: {
    signer: "operator",
    retryable: true,
    idempotencyRequired: true,
    possibleErrors: ["IDEMPOTENCY_CONFLICT", "TRANSACTION_OUTCOME_UNKNOWN"],
  },
  mintNft: {
    signer: "operator",
    retryable: true,
    idempotencyRequired: true,
    possibleErrors: ["IDEMPOTENCY_CONFLICT", "TRANSACTION_REJECTED"],
  },
  transferNft: {
    signer: "treasury",
    retryable: true,
    idempotencyRequired: true,
    possibleErrors: ["TOKEN_NOT_ASSOCIATED", "TRANSACTION_REJECTED"],
  },
  burnNft: {
    signer: "treasury",
    retryable: true,
    idempotencyRequired: true,
    possibleErrors: ["INVALID_SIGNATURE", "TRANSACTION_OUTCOME_UNKNOWN"],
  },
  submitHcsAuditMessage: {
    signer: "operator",
    retryable: true,
    idempotencyRequired: true,
    possibleErrors: ["IDEMPOTENCY_CONFLICT", "HEDERA_UNAVAILABLE"],
  },
  read: {
    signer: "none",
    retryable: true,
    idempotencyRequired: false,
    possibleErrors: ["MIRROR_NODE_UNAVAILABLE"],
  },
} as const satisfies Record<string, HederaOperationPolicy>;

/**
 * Implementations must persist idempotency results for every mutating method.
 * `operation.signer` selects the signing authority; adapters own retries but may
 * not exceed `operation.retry.maxAttempts`. Read methods never sign or retry
 * writes and therefore use lightweight read metadata.
 */
export interface HederaProvider {
  createCreatorToken(input: CreateCreatorTokenInput): Promise<CreateCreatorTokenResult>;
  mintCredits(input: CreditMintInput): Promise<HederaTransactionResult>;
  transferCredits(input: CreditTransferInput): Promise<HederaTransactionResult>;
  createClaimNftCollection(
    input: CreateClaimNftCollectionInput,
  ): Promise<CreateClaimNftCollectionResult>;
  mintNft(input: MintNftInput): Promise<MintNftResult>;
  transferNft(input: NftTransferInput): Promise<HederaTransactionResult>;
  burnNft(input: BurnNftInput): Promise<HederaTransactionResult>;
  submitHcsAuditMessage(input: HcsAuditMessageInput): Promise<HcsAuditMessageResult>;
  isTokenAssociated(
    accountId: HederaAccountId,
    tokenId: HederaTokenId,
    metadata: HederaReadMetadata,
  ): Promise<boolean>;
  getTokenBalance(
    accountId: HederaAccountId,
    tokenId: HederaTokenId,
    metadata: HederaReadMetadata,
  ): Promise<TokenAmount>;
  getNftOwner(
    tokenId: HederaTokenId,
    serial: NftSerial,
    metadata: HederaReadMetadata,
  ): Promise<HederaAccountId | undefined>;
  getTransactionStatus(
    transactionId: TransactionId,
    metadata: HederaReadMetadata,
  ): Promise<TransactionStatus>;
}

// OPEN QUESTION: Confirm whether redemption burns NFTs or sends them to treasury.
// TODO: Decide token key rotation and freeze/KYC key policy before mainnet.
