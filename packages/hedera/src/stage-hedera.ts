import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey,
  TokenBurnTransaction,
  TokenCreateTransaction,
  TokenId,
  TokenMintTransaction,
  TokenSupplyType,
  TokenType,
  TopicCreateTransaction,
  TopicId,
  TopicMessageSubmitTransaction,
  TransferTransaction,
} from "@hashgraph/sdk";
import {
  parseStageHederaConfig,
  type ParsedStageHederaConfig,
  type StageHederaConfig,
} from "./config.js";
import { createInternalTestnetClient } from "./client.js";
import { StageHederaError, normalizeHederaError } from "./errors.js";
import type { IdempotencyStore } from "./idempotency.js";
import { MirrorNodeClient } from "./mirror-node.js";
import { TransactionExecutor } from "./transaction-executor.js";
import type {
  AccountBalance,
  BurnFungibleTokenInput,
  BurnFungibleTokenResult,
  BurnNftInput,
  BurnNftResult,
  CreateFungibleTokenInput,
  CreateFungibleTokenResult,
  CreateNftCollectionInput,
  CreateNftCollectionResult,
  CreateTopicInput,
  CreateTopicResult,
  GetTopicMessagesInput,
  MintFungibleTokenInput,
  MintFungibleTokenResult,
  MintNftInput,
  MintNftResult,
  MirrorTransaction,
  NftOwner,
  PrepareTokenAssociationInput,
  PreparedTokenAssociation,
  PublishAuditEventInput,
  PublishAuditEventResult,
  TokenBalance,
  TokenInfo,
  TopicMessagePage,
  TransferFungibleTokenInput,
  TransferFungibleTokenResult,
  TransferNftInput,
  TransferNftResult,
} from "./types.js";
import {
  assertNonEmpty,
  assertNonNegativeAmount,
  assertPositiveAmount,
  assertUtf8Length,
  encodeMetadata,
  invalidInput,
  longLikeToBigInt,
  NFT_METADATA_MAX_BYTES,
  serializeAuditEvent,
  toLong,
  toNegativeLong,
} from "./utils.js";
import { prepareTokenAssociationTransaction } from "./wallet-association.js";

export interface StageHederaOptions {
  config: StageHederaConfig;
  idempotencyStore: IdempotencyStore;
  mirrorNode?: MirrorNodeClient;
  fetch?: typeof fetch;
}

function accountId(value: string, field: string, operation: string): AccountId {
  try {
    return AccountId.fromString(value);
  } catch (cause) {
    throw new StageHederaError({
      code: "INVALID_INPUT",
      message: `${field} must be a valid Hedera account ID`,
      operation,
      retryable: false,
      cause,
    });
  }
}

function tokenId(value: string, field: string, operation: string): TokenId {
  try {
    return TokenId.fromString(value);
  } catch (cause) {
    throw new StageHederaError({
      code: "INVALID_INPUT",
      message: `${field} must be a valid Hedera token ID`,
      operation,
      retryable: false,
      cause,
    });
  }
}

function topicId(value: string, operation: string): TopicId {
  try {
    return TopicId.fromString(value);
  } catch (cause) {
    throw new StageHederaError({
      code: "INVALID_INPUT",
      message: "topicId must be a valid Hedera topic ID",
      operation,
      retryable: false,
      cause,
    });
  }
}

function autoRenewDays(value: number | undefined, operation: string): number {
  const days = value ?? 90;
  if (!Number.isInteger(days) || days < 30 || days > 92) {
    invalidInput(
      "autoRenewPeriodDays must be an integer from 30 to 92",
      operation,
    );
  }
  return days;
}

export function assertNftsBurnable(
  owners: NftOwner[],
  treasuryAccountId: string,
): void {
  const rejected = owners.filter(
    (owner) => owner.deleted || owner.accountId !== treasuryAccountId,
  );
  if (rejected.length > 0) {
    throw new StageHederaError({
      code: "INVALID_INPUT",
      message:
        "NFT burn requires every serial to exist in the configured treasury",
      operation: "burnNft",
      retryable: false,
      context: {
        treasuryAccountId,
        rejectedSerials: rejected.map((owner) => ({
          serialNumber: owner.serialNumber.toString(),
          accountId: owner.accountId,
          deleted: owner.deleted,
        })),
      },
    });
  }
}

export class StageHedera {
  readonly mirrorNode: MirrorNodeClient;
  private readonly config: ParsedStageHederaConfig;
  private readonly client: Client;
  private readonly executor: TransactionExecutor;

  constructor(options: StageHederaOptions) {
    this.config = parseStageHederaConfig(options.config);
    this.client = createInternalTestnetClient(this.config);
    this.mirrorNode =
      options.mirrorNode ??
      new MirrorNodeClient(
        options.config,
        options.fetch ? { fetch: options.fetch } : {},
      );
    this.executor = new TransactionExecutor(
      this.config,
      this.client,
      this.mirrorNode,
      options.idempotencyStore,
    );
  }

  close(): void {
    this.client.close();
  }

  private validateIdempotencyKey(value: string, operation: string): void {
    assertNonEmpty(value, "idempotencyKey", operation);
    if (value.length > 200) {
      invalidInput("idempotencyKey must not exceed 200 characters", operation);
    }
  }

  private treasurySignerFor(source: AccountId, operation: string): PrivateKey {
    if (!source.equals(this.config.treasuryAccountId)) {
      throw new StageHederaError({
        code: "INVALID_INPUT",
        message:
          "Platform writes can debit only the configured treasury; user-debiting transactions must be signed and submitted by the user's wallet",
        operation,
        retryable: false,
      });
    }
    return this.config.treasuryPrivateKey;
  }

  async getOperatorBalance(): Promise<AccountBalance> {
    try {
      const balance = await new AccountBalanceQuery()
        .setAccountId(this.config.operatorAccountId)
        .execute(this.client);
      return {
        accountId: this.config.operatorAccountId.toString(),
        hbar: balance.hbars.toString(),
        tokenBalances: Object.fromEntries(
          [...balance.tokens].map(([id, amount]) => [
            id.toString(),
            amount.toString(),
          ]),
        ),
      };
    } catch (cause) {
      throw normalizeHederaError(cause, "getOperatorBalance");
    }
  }

  async createFungibleToken(
    input: CreateFungibleTokenInput,
  ): Promise<CreateFungibleTokenResult> {
    const operation = "createFungibleToken";
    this.validateIdempotencyKey(input.idempotencyKey, operation);
    assertNonEmpty(input.name, "name", operation);
    assertNonEmpty(input.symbol, "symbol", operation);
    assertUtf8Length(input.name, "name", 100, operation);
    assertUtf8Length(input.symbol, "symbol", 100, operation);
    if (input.memo) assertUtf8Length(input.memo, "memo", 100, operation);
    if (
      !Number.isInteger(input.decimals) ||
      input.decimals < 0 ||
      input.decimals > 18
    ) {
      invalidInput("decimals must be an integer from 0 to 18", operation);
    }
    const initialSupply = input.initialSupply ?? 0n;
    assertNonNegativeAmount(initialSupply, "initialSupply", operation);
    const supplyType = input.supplyType ?? "INFINITE";
    if (supplyType === "FINITE" && input.maxSupply === undefined) {
      invalidInput(
        "maxSupply is required for a finite-supply token",
        operation,
      );
    }
    if (supplyType === "INFINITE" && input.maxSupply !== undefined) {
      invalidInput(
        "maxSupply is not allowed for an infinite-supply token",
        operation,
      );
    }
    if (input.maxSupply !== undefined) {
      assertPositiveAmount(input.maxSupply, "maxSupply", operation);
      if (input.maxSupply < initialSupply) {
        invalidInput("maxSupply must be at least initialSupply", operation);
      }
    }
    const treasury = input.treasuryAccountId
      ? accountId(input.treasuryAccountId, "treasuryAccountId", operation)
      : this.config.treasuryAccountId;
    const renewDays = autoRenewDays(input.autoRenewPeriodDays, operation);
    const payload = {
      idempotencyKey: input.idempotencyKey,
      name: input.name,
      symbol: input.symbol,
      decimals: input.decimals,
      initialSupply,
      supplyType,
      ...(input.maxSupply === undefined ? {} : { maxSupply: input.maxSupply }),
      treasuryAccountId: treasury.toString(),
      supplyKey: "configured",
      ...(input.memo ? { memo: input.memo } : {}),
      autoRenewPeriodDays: renewDays,
    };
    const transaction = new TokenCreateTransaction()
      .setTokenName(input.name)
      .setTokenSymbol(input.symbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(input.decimals)
      .setInitialSupply(toLong(initialSupply))
      .setTreasuryAccountId(treasury)
      .setSupplyKey(this.config.supplyPrivateKey.publicKey)
      .setSupplyType(
        supplyType === "FINITE"
          ? TokenSupplyType.Finite
          : TokenSupplyType.Infinite,
      )
      .setAutoRenewAccountId(treasury)
      .setAutoRenewPeriod(renewDays * 86_400);
    if (input.maxSupply !== undefined)
      transaction.setMaxSupply(toLong(input.maxSupply));
    if (input.memo) transaction.setTokenMemo(input.memo);
    return this.executor.execute({
      operation,
      idempotencyKey: input.idempotencyKey,
      payload,
      transaction,
      signerKeys: [this.treasurySignerFor(treasury, operation)],
      mapReceipt: (receipt, base) => {
        const createdTokenId = receipt.tokenId?.toString();
        if (!createdTokenId) {
          throw new StageHederaError({
            code: "IDEMPOTENCY_INDETERMINATE",
            message: "Successful token receipt did not contain a token ID",
            operation,
            status: "indeterminate",
            transactionId: base.transactionId,
            retryable: false,
          });
        }
        return { ...base, tokenId: createdTokenId };
      },
    });
  }

  async mintFungibleToken(
    input: MintFungibleTokenInput,
  ): Promise<MintFungibleTokenResult> {
    const operation = "mintFungibleToken";
    this.validateIdempotencyKey(input.idempotencyKey, operation);
    assertPositiveAmount(input.amount, "amount", operation);
    const id = tokenId(input.tokenId, "tokenId", operation);
    const payload = { ...input, tokenId: id.toString() };
    const transaction = new TokenMintTransaction()
      .setTokenId(id)
      .setAmount(toLong(input.amount));
    return this.executor.execute({
      operation,
      idempotencyKey: input.idempotencyKey,
      payload,
      transaction,
      signerKeys: [this.config.supplyPrivateKey],
      mapReceipt: (receipt, base) => ({
        ...base,
        newTotalSupply: longLikeToBigInt(receipt.totalSupply),
      }),
    });
  }

  async burnFungibleToken(
    input: BurnFungibleTokenInput,
  ): Promise<BurnFungibleTokenResult> {
    const operation = "burnFungibleToken";
    this.validateIdempotencyKey(input.idempotencyKey, operation);
    assertPositiveAmount(input.amount, "amount", operation);
    const id = tokenId(input.tokenId, "tokenId", operation);
    const payload = { ...input, tokenId: id.toString() };
    const transaction = new TokenBurnTransaction()
      .setTokenId(id)
      .setAmount(toLong(input.amount));
    return this.executor.execute({
      operation,
      idempotencyKey: input.idempotencyKey,
      payload,
      transaction,
      signerKeys: [
        this.config.treasuryPrivateKey,
        this.config.supplyPrivateKey,
      ],
      mapReceipt: (receipt, base) => ({
        ...base,
        newTotalSupply: longLikeToBigInt(receipt.totalSupply),
      }),
    });
  }

  async transferFungibleToken(
    input: TransferFungibleTokenInput,
  ): Promise<TransferFungibleTokenResult> {
    const operation = "transferFungibleToken";
    this.validateIdempotencyKey(input.idempotencyKey, operation);
    assertPositiveAmount(input.amount, "amount", operation);
    const id = tokenId(input.tokenId, "tokenId", operation);
    const source = input.fromAccountId
      ? accountId(input.fromAccountId, "fromAccountId", operation)
      : this.config.treasuryAccountId;
    const recipient = accountId(input.toAccountId, "toAccountId", operation);
    const signer = this.treasurySignerFor(source, operation);
    const payload = {
      ...input,
      tokenId: id.toString(),
      fromAccountId: source.toString(),
      toAccountId: recipient.toString(),
    };
    const replay = await this.executor.resolve<TransferFungibleTokenResult>(
      operation,
      input.idempotencyKey,
      payload,
    );
    if (replay) return replay;
    if (!(await this.isTokenAssociated(recipient.toString(), id.toString()))) {
      throw new StageHederaError({
        code: "TOKEN_NOT_ASSOCIATED",
        message:
          "Recipient must associate the HTS token with a user-wallet signature before receiving it",
        operation,
        retryable: false,
        context: {
          accountId: recipient.toString(),
          tokenId: id.toString(),
        },
      });
    }
    const transaction = new TransferTransaction()
      .addTokenTransfer(id, source, toNegativeLong(input.amount))
      .addTokenTransfer(id, recipient, toLong(input.amount));
    return this.executor.execute({
      operation,
      idempotencyKey: input.idempotencyKey,
      payload,
      transaction,
      signerKeys: [signer],
      verifyMirror: (mirrorTransaction) => {
        const sender = mirrorTransaction.tokenTransfers.find(
          (transfer) =>
            transfer.tokenId === id.toString() &&
            transfer.accountId === source.toString() &&
            transfer.amount === -input.amount,
        );
        const receiver = mirrorTransaction.tokenTransfers.find(
          (transfer) =>
            transfer.tokenId === id.toString() &&
            transfer.accountId === recipient.toString() &&
            transfer.amount === input.amount,
        );
        return sender !== undefined && receiver !== undefined;
      },
      mapReceipt: (_receipt, base) => ({
        ...base,
        tokenId: id.toString(),
        fromAccountId: source.toString(),
        toAccountId: recipient.toString(),
        amount: input.amount,
      }),
    });
  }

  getTokenInfo(id: string): Promise<TokenInfo> {
    tokenId(id, "tokenId", "getTokenInfo");
    return this.mirrorNode.getTokenInfo(id);
  }

  getTokenBalance(account: string, id: string): Promise<TokenBalance> {
    accountId(account, "accountId", "getTokenBalance");
    tokenId(id, "tokenId", "getTokenBalance");
    return this.mirrorNode.getTokenBalance(account, id);
  }

  isTokenAssociated(account: string, id: string): Promise<boolean> {
    accountId(account, "accountId", "isTokenAssociated");
    tokenId(id, "tokenId", "isTokenAssociated");
    return this.mirrorNode.isTokenAssociated(account, id);
  }

  async createNftCollection(
    input: CreateNftCollectionInput,
  ): Promise<CreateNftCollectionResult> {
    const operation = "createNftCollection";
    this.validateIdempotencyKey(input.idempotencyKey, operation);
    assertNonEmpty(input.name, "name", operation);
    assertNonEmpty(input.symbol, "symbol", operation);
    assertUtf8Length(input.name, "name", 100, operation);
    assertUtf8Length(input.symbol, "symbol", 100, operation);
    if (input.memo) assertUtf8Length(input.memo, "memo", 100, operation);
    if (input.maxSupply !== undefined) {
      assertPositiveAmount(input.maxSupply, "maxSupply", operation);
    }
    const treasury = input.treasuryAccountId
      ? accountId(input.treasuryAccountId, "treasuryAccountId", operation)
      : this.config.treasuryAccountId;
    const renewDays = autoRenewDays(input.autoRenewPeriodDays, operation);
    const payload = {
      ...input,
      treasuryAccountId: treasury.toString(),
      supplyKey: "configured",
      autoRenewPeriodDays: renewDays,
    };
    const transaction = new TokenCreateTransaction()
      .setTokenName(input.name)
      .setTokenSymbol(input.symbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setDecimals(0)
      .setInitialSupply(0)
      .setTreasuryAccountId(treasury)
      .setSupplyKey(this.config.supplyPrivateKey.publicKey)
      .setAutoRenewAccountId(treasury)
      .setAutoRenewPeriod(renewDays * 86_400);
    if (input.maxSupply === undefined) {
      transaction.setSupplyType(TokenSupplyType.Infinite);
    } else {
      transaction
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(toLong(input.maxSupply));
    }
    if (input.memo) transaction.setTokenMemo(input.memo);
    return this.executor.execute({
      operation,
      idempotencyKey: input.idempotencyKey,
      payload,
      transaction,
      signerKeys: [this.treasurySignerFor(treasury, operation)],
      mapReceipt: (receipt, base) => {
        const createdTokenId = receipt.tokenId?.toString();
        if (!createdTokenId) {
          throw new StageHederaError({
            code: "IDEMPOTENCY_INDETERMINATE",
            message:
              "Successful NFT collection receipt did not contain a token ID",
            operation,
            status: "indeterminate",
            transactionId: base.transactionId,
            retryable: false,
          });
        }
        return { ...base, tokenId: createdTokenId };
      },
    });
  }

  async mintNft(input: MintNftInput): Promise<MintNftResult> {
    const operation = "mintNft";
    this.validateIdempotencyKey(input.idempotencyKey, operation);
    const id = tokenId(input.tokenId, "tokenId", operation);
    const metadata = encodeMetadata(input.metadata);
    if (
      metadata.byteLength === 0 ||
      metadata.byteLength > NFT_METADATA_MAX_BYTES
    ) {
      invalidInput(
        `NFT metadata must contain 1 to ${NFT_METADATA_MAX_BYTES} bytes`,
        operation,
      );
    }
    const payload = {
      idempotencyKey: input.idempotencyKey,
      tokenId: id.toString(),
      metadata,
    };
    const transaction = new TokenMintTransaction()
      .setTokenId(id)
      .addMetadata(metadata);
    return this.executor.execute({
      operation,
      idempotencyKey: input.idempotencyKey,
      payload,
      transaction,
      signerKeys: [this.config.supplyPrivateKey],
      mapReceipt: (receipt, base) => ({
        ...base,
        serialNumbers: (receipt.serials ?? [])
          .map((serial: unknown) => longLikeToBigInt(serial))
          .filter((serial: bigint | null): serial is bigint => serial !== null),
        newTotalSupply: longLikeToBigInt(receipt.totalSupply),
      }),
    });
  }

  async transferNft(input: TransferNftInput): Promise<TransferNftResult> {
    const operation = "transferNft";
    this.validateIdempotencyKey(input.idempotencyKey, operation);
    assertPositiveAmount(input.serialNumber, "serialNumber", operation);
    const id = tokenId(input.tokenId, "tokenId", operation);
    const source = input.fromAccountId
      ? accountId(input.fromAccountId, "fromAccountId", operation)
      : this.config.treasuryAccountId;
    const recipient = accountId(input.toAccountId, "toAccountId", operation);
    const signer = this.treasurySignerFor(source, operation);
    const payload = {
      ...input,
      tokenId: id.toString(),
      fromAccountId: source.toString(),
      toAccountId: recipient.toString(),
    };
    const replay = await this.executor.resolve<TransferNftResult>(
      operation,
      input.idempotencyKey,
      payload,
    );
    if (replay) return replay;
    if (!(await this.isTokenAssociated(recipient.toString(), id.toString()))) {
      throw new StageHederaError({
        code: "TOKEN_NOT_ASSOCIATED",
        message: "Recipient must associate the NFT collection before transfer",
        operation,
        retryable: false,
      });
    }
    const transaction = new TransferTransaction().addNftTransfer(
      id,
      toLong(input.serialNumber),
      source,
      recipient,
    );
    return this.executor.execute({
      operation,
      idempotencyKey: input.idempotencyKey,
      payload,
      transaction,
      signerKeys: [signer],
      mapReceipt: (_receipt, base) => ({
        ...base,
        tokenId: id.toString(),
        serialNumber: input.serialNumber,
        fromAccountId: source.toString(),
        toAccountId: recipient.toString(),
      }),
    });
  }

  async burnNft(input: BurnNftInput): Promise<BurnNftResult> {
    const operation = "burnNft";
    this.validateIdempotencyKey(input.idempotencyKey, operation);
    const id = tokenId(input.tokenId, "tokenId", operation);
    if (input.serialNumbers.length === 0) {
      invalidInput("serialNumbers must not be empty", operation);
    }
    input.serialNumbers.forEach((serial) =>
      assertPositiveAmount(serial, "serialNumber", operation),
    );
    if (
      new Set(input.serialNumbers.map((serial) => serial.toString())).size !==
      input.serialNumbers.length
    ) {
      invalidInput("serialNumbers must not contain duplicates", operation);
    }
    const payload = { ...input, tokenId: id.toString() };
    const replay = await this.executor.resolve<BurnNftResult>(
      operation,
      input.idempotencyKey,
      payload,
    );
    if (replay) return replay;
    const owners = await Promise.all(
      input.serialNumbers.map((serial) =>
        this.getNftOwner(id.toString(), serial),
      ),
    );
    assertNftsBurnable(owners, this.config.treasuryAccountId.toString());
    const transaction = new TokenBurnTransaction()
      .setTokenId(id)
      .setSerials(input.serialNumbers.map(toLong));
    return this.executor.execute({
      operation,
      idempotencyKey: input.idempotencyKey,
      payload,
      transaction,
      signerKeys: [
        this.config.treasuryPrivateKey,
        this.config.supplyPrivateKey,
      ],
      mapReceipt: (receipt, base) => ({
        ...base,
        serialNumbers: [...input.serialNumbers],
        newTotalSupply: longLikeToBigInt(receipt.totalSupply),
      }),
    });
  }

  getNftOwner(id: string, serialNumber: bigint): Promise<NftOwner> {
    tokenId(id, "tokenId", "getNftOwner");
    assertPositiveAmount(serialNumber, "serialNumber", "getNftOwner");
    return this.mirrorNode.getNftOwner(id, serialNumber);
  }

  async createTopic(input: CreateTopicInput): Promise<CreateTopicResult> {
    const operation = "createTopic";
    this.validateIdempotencyKey(input.idempotencyKey, operation);
    const renewDays = autoRenewDays(input.autoRenewPeriodDays, operation);
    if (input.memo) assertUtf8Length(input.memo, "memo", 100, operation);
    const adminKey = input.adminKey ?? "none";
    if (adminKey === "configured" && !this.config.hcsAdminPrivateKey) {
      throw new StageHederaError({
        code: "CONFIGURATION_ERROR",
        message:
          "HEDERA_HCS_ADMIN_PRIVATE_KEY is required when adminKey is configured",
        operation,
        retryable: false,
      });
    }
    const payload = {
      ...input,
      adminKey,
      submitKey: "configured",
      autoRenewPeriodDays: renewDays,
    };
    const transaction = new TopicCreateTransaction()
      .setSubmitKey(this.config.hcsSubmitPrivateKey.publicKey)
      .setAutoRenewAccountId(this.config.operatorAccountId)
      .setAutoRenewPeriod(renewDays * 86_400);
    if (input.memo) transaction.setTopicMemo(input.memo);
    if (adminKey === "configured" && this.config.hcsAdminPrivateKey) {
      transaction.setAdminKey(this.config.hcsAdminPrivateKey.publicKey);
    }
    return this.executor.execute({
      operation,
      idempotencyKey: input.idempotencyKey,
      payload,
      transaction,
      mapReceipt: (receipt, base) => {
        const createdTopicId = receipt.topicId?.toString();
        if (!createdTopicId) {
          throw new StageHederaError({
            code: "IDEMPOTENCY_INDETERMINATE",
            message: "Successful topic receipt did not contain a topic ID",
            operation,
            status: "indeterminate",
            transactionId: base.transactionId,
            retryable: false,
          });
        }
        return { ...base, topicId: createdTopicId };
      },
    });
  }

  async publishAuditEvent(
    input: PublishAuditEventInput,
  ): Promise<PublishAuditEventResult> {
    const operation = "publishAuditEvent";
    this.validateIdempotencyKey(input.idempotencyKey, operation);
    const id = topicId(input.topicId, operation);
    const message = serializeAuditEvent(input.event);
    const payload = {
      idempotencyKey: input.idempotencyKey,
      topicId: id.toString(),
      event: input.event,
    };
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(id)
      .setMessage(message);
    return this.executor.execute({
      operation,
      idempotencyKey: input.idempotencyKey,
      payload,
      transaction,
      signerKeys: [this.config.hcsSubmitPrivateKey],
      mapReceipt: (receipt, base) => ({
        ...base,
        topicId: id.toString(),
        sequenceNumber: longLikeToBigInt(receipt.topicSequenceNumber),
      }),
    });
  }

  getTopicMessages(input: GetTopicMessagesInput): Promise<TopicMessagePage> {
    topicId(input.topicId, "getTopicMessages");
    if (input.sequenceNumber !== undefined) {
      assertPositiveAmount(
        input.sequenceNumber,
        "sequenceNumber",
        "getTopicMessages",
      );
    }
    return this.mirrorNode.getTopicMessages(input);
  }

  getTransaction(transactionId: string): Promise<MirrorTransaction | null> {
    assertNonEmpty(transactionId, "transactionId", "getTransaction");
    return this.mirrorNode.getTransaction(transactionId);
  }

  async prepareTokenAssociation(
    input: PrepareTokenAssociationInput,
  ): Promise<PreparedTokenAssociation> {
    const operation = "prepareTokenAssociation";
    const account = accountId(
      input.accountId,
      "accountId",
      operation,
    ).toString();
    if (input.tokenIds.length === 0) {
      invalidInput("tokenIds must contain at least one token ID", operation);
    }
    const ids = input.tokenIds.map((id) =>
      tokenId(id, "tokenId", operation).toString(),
    );
    if (new Set(ids).size !== ids.length) {
      invalidInput("tokenIds must not contain duplicates", operation);
    }
    if (
      input.maxTransactionFeeHbar !== undefined &&
      (!Number.isFinite(input.maxTransactionFeeHbar) ||
        input.maxTransactionFeeHbar <= 0)
    ) {
      invalidInput("maxTransactionFeeHbar must be positive", operation);
    }
    const nodeAccountIds = input.nodeAccountIds?.map((id) =>
      accountId(id, "nodeAccountId", operation).toString(),
    );
    const associations = await Promise.all(
      ids.map(async (id) => ({
        id,
        associated: await this.isTokenAssociated(account, id),
      })),
    );
    const alreadyAssociated = associations
      .filter(({ associated }) => associated)
      .map(({ id }) => id);
    if (alreadyAssociated.length > 0) {
      throw new StageHederaError({
        code: "TOKEN_ALREADY_ASSOCIATED",
        message:
          "Account is already associated with one or more requested tokens",
        operation,
        retryable: false,
        context: { accountId: account, tokenIds: alreadyAssociated },
      });
    }
    return prepareTokenAssociationTransaction(this.client, this.config, {
      ...input,
      accountId: account,
      tokenIds: ids,
      ...(nodeAccountIds ? { nodeAccountIds } : {}),
    });
  }

  prepareTokenAssociationTransaction(
    input: PrepareTokenAssociationInput,
  ): Promise<PreparedTokenAssociation> {
    return this.prepareTokenAssociation(input);
  }
}
