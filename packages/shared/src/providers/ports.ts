import type {
  FileId,
  HederaAccountId,
  HederaTokenId,
  IsoTimestamp,
  JobId,
  JsonObject,
  NftSerial,
  TransactionId,
} from "../domain/primitives.js";

export interface StoredFile {
  id: FileId;
  contentType: string;
  sizeBytes: number;
  publicUrl?: string;
}

export interface FileStoragePort {
  put(input: {
    bytesBase64: string;
    contentType: string;
    fileName: string;
  }): Promise<StoredFile>;
  delete(fileId: FileId): Promise<void>;
  getPublicUrl(fileId: FileId): Promise<string | undefined>;
}

export interface Job {
  name: string;
  payload: JsonObject;
  idempotencyKey: string;
  runAt?: IsoTimestamp;
}

export interface JobQueuePort {
  enqueue(job: Job): Promise<JobId>;
}

export interface WorldVerificationRequest {
  proof: string;
  merkleRoot: string;
  nullifierHash: string;
  action: string;
  signal?: string;
}

export type WorldVerificationResult =
  | { verified: true }
  | { verified: false; reason: string };

export interface WorldVerifierPort {
  /** Verification material is sensitive and must never enter logs, events, or HCS. */
  verify(request: WorldVerificationRequest): Promise<WorldVerificationResult>;
}

export interface ClockPort {
  now(): IsoTimestamp;
}

export interface IdGeneratorPort {
  /** Callers cast the generated opaque string to the required branded ID. */
  generate(): string;
}

export interface ExplorerUrlBuilderPort {
  account(accountId: HederaAccountId): string;
  token(tokenId: HederaTokenId): string;
  nft(tokenId: HederaTokenId, serial: NftSerial): string;
  transaction(transactionId: TransactionId): string;
}

// OPEN QUESTION: File deletion may need retention/tombstone semantics for audits.
