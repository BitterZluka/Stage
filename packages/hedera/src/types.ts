export type HederaNetwork = "testnet";

export type NormalizedTransactionStatus =
  "success" | "pending" | "failed" | "indeterminate";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface HederaWriteResult {
  transactionId: string;
  receiptStatus: string;
  consensusTimestamp?: string;
  explorerUrl: string;
  status: NormalizedTransactionStatus;
  mirrorVerified: boolean;
  replayed?: boolean;
}

export interface CreateFungibleTokenInput {
  idempotencyKey: string;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply?: bigint;
  supplyType?: "INFINITE" | "FINITE";
  maxSupply?: bigint;
  treasuryAccountId?: string;
  /** Uses the package's configured supply signer. */
  supplyKey?: "configured";
  memo?: string;
  autoRenewPeriodDays?: number;
}

export interface CreateFungibleTokenResult extends HederaWriteResult {
  tokenId: string;
}

export interface MintFungibleTokenInput {
  idempotencyKey: string;
  tokenId: string;
  /** Smallest token units. */
  amount: bigint;
}

export interface MintFungibleTokenResult extends HederaWriteResult {
  newTotalSupply: bigint | null;
}

export interface BurnFungibleTokenInput {
  idempotencyKey: string;
  tokenId: string;
  amount: bigint;
}

export interface BurnFungibleTokenResult extends HederaWriteResult {
  newTotalSupply: bigint | null;
}

export interface TransferFungibleTokenInput {
  idempotencyKey: string;
  tokenId: string;
  toAccountId: string;
  amount: bigint;
  /** Only the configured treasury can be debited by this platform API. */
  fromAccountId?: string;
}

export interface TransferFungibleTokenResult extends HederaWriteResult {
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: bigint;
}

export interface TokenInfo {
  tokenId: string;
  type: "FUNGIBLE_COMMON" | "NON_FUNGIBLE_UNIQUE" | string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  initialSupply: bigint;
  maxSupply: bigint | null;
  supplyType: "FINITE" | "INFINITE" | string;
  treasuryAccountId: string | null;
  deleted: boolean;
  memo: string;
  createdTimestamp: string | null;
  modifiedTimestamp: string | null;
}

export interface TokenBalance {
  accountId: string;
  tokenId: string;
  balance: bigint;
  decimals: number | null;
  associated: boolean;
  automaticAssociation: boolean | null;
  freezeStatus: string | null;
  kycStatus: string | null;
}

export interface AccountBalance {
  accountId: string;
  hbar: string;
  tokenBalances: Record<string, string>;
}

export interface AccountKeyInfo {
  accountId: string;
  keyType: string;
  publicKey: string;
}

export interface VerifyWalletSignatureInput {
  accountId: string;
  message: string;
  signatureBase64: string;
}

export interface WalletSignatureVerification {
  valid: boolean;
  accountId: string;
  keyType: string;
  publicKey: string;
}

export interface CreateNftCollectionInput {
  idempotencyKey: string;
  name: string;
  symbol: string;
  maxSupply?: bigint;
  treasuryAccountId?: string;
  supplyKey?: "configured";
  memo?: string;
  autoRenewPeriodDays?: number;
}

export interface CreateNftCollectionResult extends HederaWriteResult {
  tokenId: string;
}

export interface MintNftInput {
  idempotencyKey: string;
  tokenId: string;
  /** Bytes, UTF-8 text, or deterministic JSON. Maximum encoded size is 100 bytes. */
  metadata: Uint8Array | string | JsonValue;
}

export interface MintNftResult extends HederaWriteResult {
  serialNumbers: bigint[];
  newTotalSupply: bigint | null;
}

export interface TransferNftInput {
  idempotencyKey: string;
  tokenId: string;
  serialNumber: bigint;
  fromAccountId?: string;
  toAccountId: string;
}

export interface TransferNftResult extends HederaWriteResult {
  tokenId: string;
  serialNumber: bigint;
  fromAccountId: string;
  toAccountId: string;
}

export interface BurnNftInput {
  idempotencyKey: string;
  tokenId: string;
  serialNumbers: bigint[];
}

export interface BurnNftResult extends HederaWriteResult {
  serialNumbers: bigint[];
  newTotalSupply: bigint | null;
}

export interface NftOwner {
  tokenId: string;
  serialNumber: bigint;
  accountId: string | null;
  deleted: boolean;
  metadataBase64: string;
  metadataUtf8: string | null;
  createdTimestamp: string | null;
  modifiedTimestamp: string | null;
}

export interface CreateTopicInput {
  idempotencyKey: string;
  memo?: string;
  adminKey?: "configured" | "none";
  submitKey?: "configured";
  autoRenewPeriodDays?: number;
}

export interface CreateTopicResult extends HederaWriteResult {
  topicId: string;
}

export type StageAuditEventType =
  | "creator_token_created"
  | "challenge_published"
  | "winner_selected"
  | "reward_paid"
  | "claim_minted"
  | "claim_redeemed";

export interface StageAuditEvent {
  schema: "ethglobal.audit";
  version: 1;
  eventId: string;
  eventType: StageAuditEventType;
  occurredAt: string;
  creatorId?: string;
  transactionId?: string;
  publicData: { [key: string]: JsonValue };
}

export interface PublishAuditEventInput {
  idempotencyKey: string;
  topicId: string;
  event: StageAuditEvent;
}

export interface PublishAuditEventResult extends HederaWriteResult {
  topicId: string;
  sequenceNumber: bigint | null;
}

export interface TopicMessage {
  topicId: string;
  sequenceNumber: bigint;
  consensusTimestamp: string;
  payerAccountId: string | null;
  messageBase64: string;
  messageUtf8: string;
  event: StageAuditEvent | null;
  validationError?: string;
  runningHashBase64: string;
}

export interface GetTopicMessagesInput {
  topicId: string;
  limit?: number;
  order?: "asc" | "desc";
  sequenceNumber?: bigint;
  timestamp?: string;
  next?: string;
}

export interface TopicMessagePage {
  messages: TopicMessage[];
  next?: string;
}

export interface HbarTransfer {
  accountId: string | null;
  amountTinybar: bigint;
  isApproval: boolean;
}

export interface TokenTransfer {
  tokenId: string | null;
  accountId: string | null;
  amount: bigint;
  isApproval: boolean;
}

export interface NftTransfer {
  tokenId: string | null;
  senderAccountId: string | null;
  receiverAccountId: string | null;
  serialNumber: bigint;
  isApproval: boolean;
}

export interface MirrorTransaction {
  transactionId: string;
  consensusTimestamp: string;
  result: string;
  name: string;
  memo: string | null;
  entityId: string | null;
  chargedTxFeeTinybar: bigint | null;
  transactionHashBase64: string | null;
  scheduled: boolean;
  validStartTimestamp: string | null;
  transfers: HbarTransfer[];
  tokenTransfers: TokenTransfer[];
  nftTransfers: NftTransfer[];
}

export interface PrepareTokenAssociationInput {
  accountId: string;
  tokenIds: string[];
  nodeAccountIds?: string[];
  maxTransactionFeeHbar?: number;
}

export interface PreparedTokenAssociation {
  transactionId: string;
  accountId: string;
  tokenIds: string[];
  transactionBytesBase64: string;
  explorerUrl: string;
  signingResponsibility: "user_wallet";
}
