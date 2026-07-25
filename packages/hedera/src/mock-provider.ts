import {
  TransactionStatus,
  type BurnNftInput,
  type CreateClaimNftCollectionInput,
  type CreateClaimNftCollectionResult,
  type CreateCreatorTokenInput,
  type CreateCreatorTokenResult,
  type CreditMintInput,
  type CreditTransferInput,
  type HederaAccountId,
  type HederaProvider,
  type HederaReadMetadata,
  type HederaTokenId,
  type HederaTransactionResult,
  type HcsAuditMessageInput,
  type HcsAuditMessageResult,
  type MintNftInput,
  type MintNftResult,
  type NftSerial,
  type NftTransferInput,
  type TokenAmount,
  type TransactionId,
} from "@creator-platform/shared";

const transactionResult = (key: string): HederaTransactionResult => ({
  transactionId: `mock-${key}` as TransactionId,
  status: TransactionStatus.Success,
});

/**
 * Deterministic provider for API/worker contract tests and local development.
 * It never imports keys, signs, or submits a Hedera transaction.
 */
export class MockHederaProvider implements HederaProvider {
  async createCreatorToken(
    input: CreateCreatorTokenInput,
  ): Promise<CreateCreatorTokenResult> {
    return {
      ...transactionResult(input.operation.idempotencyKey),
      tokenId: "0.0.1001" as HederaTokenId,
    };
  }

  async mintCredits(input: CreditMintInput): Promise<HederaTransactionResult> {
    return transactionResult(input.operation.idempotencyKey);
  }

  async transferCredits(
    input: CreditTransferInput,
  ): Promise<HederaTransactionResult> {
    return transactionResult(input.operation.idempotencyKey);
  }

  async createClaimNftCollection(
    input: CreateClaimNftCollectionInput,
  ): Promise<CreateClaimNftCollectionResult> {
    return {
      ...transactionResult(input.operation.idempotencyKey),
      tokenId: "0.0.2001" as HederaTokenId,
    };
  }

  async mintNft(input: MintNftInput): Promise<MintNftResult> {
    return {
      ...transactionResult(input.operation.idempotencyKey),
      serial: "1" as NftSerial,
    };
  }

  async transferNft(input: NftTransferInput): Promise<HederaTransactionResult> {
    return transactionResult(input.operation.idempotencyKey);
  }

  async burnNft(input: BurnNftInput): Promise<HederaTransactionResult> {
    return transactionResult(input.operation.idempotencyKey);
  }

  async submitHcsAuditMessage(
    input: HcsAuditMessageInput,
  ): Promise<HcsAuditMessageResult> {
    return {
      ...transactionResult(input.operation.idempotencyKey),
      sequenceNumber: "1",
    };
  }

  async isTokenAssociated(
    _accountId: HederaAccountId,
    _tokenId: HederaTokenId,
    _metadata: HederaReadMetadata,
  ): Promise<boolean> {
    void _accountId;
    void _tokenId;
    void _metadata;
    return true;
  }

  async getTokenBalance(
    _accountId: HederaAccountId,
    _tokenId: HederaTokenId,
    _metadata: HederaReadMetadata,
  ): Promise<TokenAmount> {
    void _accountId;
    void _tokenId;
    void _metadata;
    return "0" as TokenAmount;
  }

  async getNftOwner(
    _tokenId: HederaTokenId,
    _serial: NftSerial,
    _metadata: HederaReadMetadata,
  ): Promise<HederaAccountId | undefined> {
    void _tokenId;
    void _serial;
    void _metadata;
    return undefined;
  }

  async getTransactionStatus(
    _transactionId: TransactionId,
    _metadata: HederaReadMetadata,
  ): Promise<TransactionStatus> {
    void _transactionId;
    void _metadata;
    return TransactionStatus.Success;
  }
}
