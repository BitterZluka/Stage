import {
  TransactionStatus,
  type BurnNftInput as ProviderBurnNftInput,
  type CreateClaimNftCollectionInput,
  type CreateClaimNftCollectionResult,
  type CreateCreatorTokenInput,
  type CreateCreatorTokenResult,
  type CreditMintInput,
  type CreditTransferInput,
  type HederaAccountId,
  type HederaOperationPolicy,
  type HederaProvider,
  type HederaReadMetadata,
  type HederaTokenId,
  type HederaTransactionResult,
  type HcsAuditMessageInput,
  type HcsAuditMessageResult,
  type IsoTimestamp,
  type MintNftInput as ProviderMintNftInput,
  type MintNftResult as ProviderMintNftResult,
  type NftSerial,
  type NftTransferInput,
  type OperationMetadata,
  type TokenAmount,
  type TransactionId,
} from "@creator-platform/shared";
import { StageHederaError } from "./errors.js";
import { StageHedera, type StageHederaOptions } from "./stage-hedera.js";
import type { HederaWriteResult } from "./types.js";

function assertOperation(
  operation: OperationMetadata,
  signer: HederaOperationPolicy["signer"],
  name: string,
): void {
  if (!operation.idempotencyKey.trim()) {
    throw new StageHederaError({
      code: "INVALID_INPUT",
      message: "operation.idempotencyKey must not be empty",
      operation: name,
      retryable: false,
    });
  }
  if (
    !Number.isInteger(operation.retry.attempt) ||
    !Number.isInteger(operation.retry.maxAttempts) ||
    operation.retry.attempt < 1 ||
    operation.retry.maxAttempts < operation.retry.attempt
  ) {
    throw new StageHederaError({
      code: "INVALID_INPUT",
      message: "operation.retry must be a valid bounded retry policy",
      operation: name,
      retryable: false,
    });
  }
  if (operation.signer !== signer) {
    throw new StageHederaError({
      code: "INVALID_INPUT",
      message: `${name} requires the ${signer} signer role`,
      operation: name,
      retryable: false,
    });
  }
}

function parseTokenAmount(value: string, operation: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new StageHederaError({
      code: "INVALID_INPUT",
      message: "Token amounts must be non-negative base-10 integer strings",
      operation,
      retryable: false,
    });
  }
  return BigInt(value);
}

function transactionStatus(result: HederaWriteResult): TransactionStatus {
  switch (result.status) {
    case "success":
      return TransactionStatus.Success;
    case "pending":
      return TransactionStatus.Pending;
    case "failed":
      return TransactionStatus.Failed;
    case "indeterminate":
      return TransactionStatus.Unknown;
  }
}

function providerResult(result: HederaWriteResult): HederaTransactionResult {
  return {
    transactionId: result.transactionId as TransactionId,
    status: transactionStatus(result),
  };
}

function consensusTimestampToIso(
  value: string | undefined,
): IsoTimestamp | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d+)\.(\d{1,9})$/);
  if (!match?.[1] || !match[2]) return undefined;
  const milliseconds =
    Number(match[1]) * 1_000 +
    Math.floor(Number(match[2].padEnd(9, "0")) / 1_000_000);
  if (!Number.isSafeInteger(milliseconds)) return undefined;
  return new Date(milliseconds).toISOString() as IsoTimestamp;
}

/**
 * JSON-safe adapter used by apps/api and apps/worker. The richer StageHedera
 * service remains behind this boundary and no SDK object crosses it.
 */
export class SdkHederaProvider implements HederaProvider {
  readonly service: StageHedera;

  constructor(options: StageHederaOptions | StageHedera) {
    this.service =
      options instanceof StageHedera ? options : new StageHedera(options);
  }

  close(): void {
    this.service.close();
  }

  async createCreatorToken(
    input: CreateCreatorTokenInput,
  ): Promise<CreateCreatorTokenResult> {
    assertOperation(input.operation, "operator", "createCreatorToken");
    const result = await this.service.createFungibleToken({
      idempotencyKey: input.operation.idempotencyKey,
      name: input.name,
      symbol: input.symbol,
      decimals: input.decimals,
      initialSupply: parseTokenAmount(
        input.initialSupply,
        "createCreatorToken",
      ),
      treasuryAccountId: input.treasuryAccountId,
      supplyType: "INFINITE",
    });
    return {
      ...providerResult(result),
      tokenId: result.tokenId as HederaTokenId,
    };
  }

  async mintCredits(input: CreditMintInput): Promise<HederaTransactionResult> {
    assertOperation(input.operation, "operator", "mintCredits");
    return providerResult(
      await this.service.mintFungibleToken({
        idempotencyKey: input.operation.idempotencyKey,
        tokenId: input.tokenId,
        amount: parseTokenAmount(input.amount, "mintCredits"),
      }),
    );
  }

  async transferCredits(
    input: CreditTransferInput,
  ): Promise<HederaTransactionResult> {
    assertOperation(input.operation, "treasury", "transferCredits");
    return providerResult(
      await this.service.transferFungibleToken({
        idempotencyKey: input.operation.idempotencyKey,
        tokenId: input.tokenId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: parseTokenAmount(input.amount, "transferCredits"),
      }),
    );
  }

  async createClaimNftCollection(
    input: CreateClaimNftCollectionInput,
  ): Promise<CreateClaimNftCollectionResult> {
    assertOperation(input.operation, "operator", "createClaimNftCollection");
    const result = await this.service.createNftCollection({
      idempotencyKey: input.operation.idempotencyKey,
      name: input.name,
      symbol: input.symbol,
      treasuryAccountId: input.treasuryAccountId,
      ...(input.maxSupply
        ? {
            maxSupply: parseTokenAmount(
              input.maxSupply,
              "createClaimNftCollection",
            ),
          }
        : {}),
    });
    return {
      ...providerResult(result),
      tokenId: result.tokenId as HederaTokenId,
    };
  }

  async mintNft(input: ProviderMintNftInput): Promise<ProviderMintNftResult> {
    assertOperation(input.operation, "operator", "mintNft");
    const metadata = Buffer.from(input.metadataBase64, "base64");
    if (metadata.length === 0) {
      throw new StageHederaError({
        code: "INVALID_INPUT",
        message: "metadataBase64 must contain valid non-empty base64 data",
        operation: "mintNft",
        retryable: false,
      });
    }
    const result = await this.service.mintNft({
      idempotencyKey: input.operation.idempotencyKey,
      tokenId: input.tokenId,
      metadata,
    });
    const serial = result.serialNumbers[0];
    if (serial === undefined) {
      throw new StageHederaError({
        code: "IDEMPOTENCY_INDETERMINATE",
        message: "Successful NFT mint did not return a serial number",
        operation: "mintNft",
        transactionId: result.transactionId,
        status: "indeterminate",
        retryable: false,
      });
    }
    return {
      ...providerResult(result),
      serial: serial.toString() as NftSerial,
    };
  }

  async transferNft(input: NftTransferInput): Promise<HederaTransactionResult> {
    assertOperation(input.operation, "treasury", "transferNft");
    return providerResult(
      await this.service.transferNft({
        idempotencyKey: input.operation.idempotencyKey,
        tokenId: input.tokenId,
        serialNumber: parseTokenAmount(input.serial, "transferNft"),
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
      }),
    );
  }

  async burnNft(input: ProviderBurnNftInput): Promise<HederaTransactionResult> {
    assertOperation(input.operation, "treasury", "burnNft");
    return providerResult(
      await this.service.burnNft({
        idempotencyKey: input.operation.idempotencyKey,
        tokenId: input.tokenId,
        serialNumbers: [parseTokenAmount(input.serial, "burnNft")],
      }),
    );
  }

  async submitHcsAuditMessage(
    input: HcsAuditMessageInput,
  ): Promise<HcsAuditMessageResult> {
    assertOperation(input.operation, "operator", "submitHcsAuditMessage");
    const result = await this.service.publishAuditEvent({
      idempotencyKey: input.operation.idempotencyKey,
      topicId: input.topicId,
      event: input.payload,
    });
    const consensusTimestamp = consensusTimestampToIso(
      result.consensusTimestamp,
    );
    return {
      ...providerResult(result),
      ...(result.sequenceNumber === null
        ? {}
        : { sequenceNumber: result.sequenceNumber.toString() }),
      ...(consensusTimestamp ? { consensusTimestamp } : {}),
    };
  }

  isTokenAssociated(
    accountId: HederaAccountId,
    tokenId: HederaTokenId,
    _metadata: HederaReadMetadata,
  ): Promise<boolean> {
    void _metadata;
    return this.service.isTokenAssociated(accountId, tokenId);
  }

  async getTokenBalance(
    accountId: HederaAccountId,
    tokenId: HederaTokenId,
    _metadata: HederaReadMetadata,
  ): Promise<TokenAmount> {
    void _metadata;
    const balance = await this.service.getTokenBalance(accountId, tokenId);
    return balance.balance.toString() as TokenAmount;
  }

  async getNftOwner(
    tokenId: HederaTokenId,
    serial: NftSerial,
    _metadata: HederaReadMetadata,
  ): Promise<HederaAccountId | undefined> {
    void _metadata;
    const owner = await this.service.getNftOwner(
      tokenId,
      parseTokenAmount(serial, "getNftOwner"),
    );
    return owner.accountId ? (owner.accountId as HederaAccountId) : undefined;
  }

  async getTransactionStatus(
    transactionId: TransactionId,
    _metadata: HederaReadMetadata,
  ): Promise<TransactionStatus> {
    void _metadata;
    const transaction = await this.service.getTransaction(transactionId);
    if (!transaction) return TransactionStatus.Pending;
    if (transaction.result === "SUCCESS") return TransactionStatus.Success;
    if (transaction.result === "UNKNOWN") return TransactionStatus.Unknown;
    return TransactionStatus.Failed;
  }
}
