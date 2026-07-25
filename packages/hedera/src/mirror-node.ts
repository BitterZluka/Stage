import { StageHederaError } from "./errors.js";
import type {
  GetTopicMessagesInput,
  MirrorTransaction,
  NftOwner,
  TokenBalance,
  TokenInfo,
  TopicMessage,
  TopicMessagePage,
} from "./types.js";
import { parseAuditEvent, sleep, toMirrorTransactionId } from "./utils.js";

export interface MirrorNodeConfig {
  mirrorNodeUrl: string;
  mirrorRequestTimeoutMs: number;
  mirrorVerificationTimeoutMs: number;
  mirrorPollIntervalMs: number;
  mirrorMaxAttempts: number;
}

export interface MirrorNodeClientOptions {
  fetch?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new StageHederaError({
      code: "MIRROR_NODE_ERROR",
      message: `Mirror Node returned an invalid ${label}`,
      operation: "mirrorNode.parse",
      retryable: false,
    });
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function bigintValue(value: unknown, field: string): bigint {
  if (
    (typeof value === "string" || typeof value === "number") &&
    /^-?\d+$/.test(String(value))
  ) {
    return BigInt(String(value));
  }
  throw new StageHederaError({
    code: "MIRROR_NODE_ERROR",
    message: `Mirror Node returned an invalid integer for ${field}`,
    operation: "mirrorNode.parse",
    retryable: false,
  });
}

function optionalBigint(value: unknown, field: string): bigint | null {
  return value === null || value === undefined
    ? null
    : bigintValue(value, field);
}

function decodeBase64Utf8(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return Buffer.from(value, "base64").toString("utf8");
}

export class MirrorNodeClient {
  private readonly fetchImplementation: typeof fetch;
  private readonly sleepImplementation: (milliseconds: number) => Promise<void>;
  private readonly origin: string;

  constructor(
    private readonly config: MirrorNodeConfig,
    options: MirrorNodeClientOptions = {},
  ) {
    this.fetchImplementation = options.fetch ?? fetch;
    this.sleepImplementation = options.sleep ?? sleep;
    this.origin = new URL(config.mirrorNodeUrl).origin;
  }

  private async request(
    path: string,
    allowNotFound = false,
  ): Promise<unknown | null> {
    const requestUrl = this.resolvePath(path);
    let lastError: unknown;
    for (
      let attempt = 1;
      attempt <= this.config.mirrorMaxAttempts;
      attempt += 1
    ) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.mirrorRequestTimeoutMs,
      );
      try {
        const response = await this.fetchImplementation(requestUrl, {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        if (response.status === 404 && allowNotFound) return null;
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          const body = (await response.text()).slice(0, 500);
          const error = new StageHederaError({
            code:
              response.status === 404
                ? "MIRROR_NODE_NOT_FOUND"
                : "MIRROR_NODE_ERROR",
            message: `Mirror Node HTTP ${response.status}`,
            operation: "mirrorNode.request",
            retryable,
            context: { path: new URL(requestUrl).pathname, responseBody: body },
          });
          if (!retryable || attempt === this.config.mirrorMaxAttempts)
            throw error;
          lastError = error;
        } else {
          return await response.json();
        }
      } catch (error) {
        if (error instanceof StageHederaError && !error.retryable) throw error;
        lastError = error;
        if (attempt === this.config.mirrorMaxAttempts) {
          if (error instanceof StageHederaError) throw error;
          throw new StageHederaError({
            code: "MIRROR_NODE_ERROR",
            message: "Mirror Node request failed",
            operation: "mirrorNode.request",
            retryable: true,
            context: { path: new URL(requestUrl).pathname },
            cause: error,
          });
        }
      } finally {
        clearTimeout(timeout);
      }
      await this.sleepImplementation(100 * 2 ** (attempt - 1));
    }
    throw lastError;
  }

  private resolvePath(path: string): string {
    const url = new URL(path, `${this.config.mirrorNodeUrl}/`);
    if (url.origin !== this.origin || !url.pathname.startsWith("/api/v1/")) {
      throw new StageHederaError({
        code: "MIRROR_NODE_ERROR",
        message: "Mirror Node pagination URL escaped the configured API origin",
        operation: "mirrorNode.pagination",
        retryable: false,
      });
    }
    return url.toString();
  }

  private safeNext(value: unknown): string | undefined {
    if (typeof value !== "string" || value.length === 0) return undefined;
    const url = new URL(value, `${this.config.mirrorNodeUrl}/`);
    if (url.origin !== this.origin || !url.pathname.startsWith("/api/v1/")) {
      throw new StageHederaError({
        code: "MIRROR_NODE_ERROR",
        message: "Mirror Node returned an unsafe pagination link",
        operation: "mirrorNode.pagination",
        retryable: false,
      });
    }
    return `${url.pathname}${url.search}`;
  }

  async getTokenInfo(tokenId: string): Promise<TokenInfo> {
    const data = objectValue(
      await this.request(`/api/v1/tokens/${encodeURIComponent(tokenId)}`),
      "token response",
    );
    return {
      tokenId: stringValue(data.token_id),
      type: stringValue(data.type),
      name: stringValue(data.name),
      symbol: stringValue(data.symbol),
      decimals: Number(data.decimals),
      totalSupply: bigintValue(data.total_supply, "total_supply"),
      initialSupply: bigintValue(data.initial_supply, "initial_supply"),
      maxSupply: optionalBigint(data.max_supply, "max_supply"),
      supplyType: stringValue(data.supply_type),
      treasuryAccountId: nullableString(data.treasury_account_id),
      deleted: booleanValue(data.deleted),
      memo: stringValue(data.memo),
      createdTimestamp: nullableString(data.created_timestamp),
      modifiedTimestamp: nullableString(data.modified_timestamp),
    };
  }

  async getTokenBalance(
    accountId: string,
    tokenId: string,
  ): Promise<TokenBalance> {
    const query = new URLSearchParams({ "token.id": tokenId, limit: "1" });
    const response = objectValue(
      await this.request(
        `/api/v1/accounts/${encodeURIComponent(accountId)}/tokens?${query.toString()}`,
      ),
      "account token response",
    );
    const tokens = Array.isArray(response.tokens) ? response.tokens : [];
    const relationship = tokens
      .map((value) => objectValue(value, "account token relationship"))
      .find((value) => value.token_id === tokenId);
    return {
      accountId,
      tokenId,
      balance: relationship ? bigintValue(relationship.balance, "balance") : 0n,
      decimals:
        relationship && Number.isInteger(relationship.decimals)
          ? Number(relationship.decimals)
          : null,
      associated: relationship !== undefined,
      automaticAssociation:
        relationship && typeof relationship.automatic_association === "boolean"
          ? relationship.automatic_association
          : null,
      freezeStatus: relationship
        ? nullableString(relationship.freeze_status)
        : null,
      kycStatus: relationship ? nullableString(relationship.kyc_status) : null,
    };
  }

  async isTokenAssociated(
    accountId: string,
    tokenId: string,
  ): Promise<boolean> {
    return (await this.getTokenBalance(accountId, tokenId)).associated;
  }

  async getNftOwner(tokenId: string, serialNumber: bigint): Promise<NftOwner> {
    const response = await this.request(
      `/api/v1/tokens/${encodeURIComponent(tokenId)}/nfts/${serialNumber.toString()}`,
      true,
    );
    if (!response) {
      throw new StageHederaError({
        code: "MIRROR_NODE_NOT_FOUND",
        message: `NFT ${tokenId}/${serialNumber.toString()} was not found`,
        operation: "getNftOwner",
        retryable: false,
      });
    }
    const data = objectValue(response, "NFT response");
    const metadata = stringValue(data.metadata);
    const decoded = Buffer.from(metadata, "base64").toString("utf8");
    return {
      tokenId: stringValue(data.token_id),
      serialNumber: bigintValue(data.serial_number, "serial_number"),
      accountId: nullableString(data.account_id),
      deleted: booleanValue(data.deleted),
      metadataBase64: metadata,
      metadataUtf8: decoded.length > 0 ? decoded : null,
      createdTimestamp: nullableString(data.created_timestamp),
      modifiedTimestamp: nullableString(data.modified_timestamp),
    };
  }

  async getTopicMessages(
    input: GetTopicMessagesInput,
  ): Promise<TopicMessagePage> {
    let path: string;
    if (input.next) {
      path = input.next;
    } else {
      const query = new URLSearchParams({
        limit: String(Math.min(Math.max(input.limit ?? 25, 1), 100)),
        order: input.order ?? "asc",
      });
      if (input.sequenceNumber !== undefined) {
        query.set("sequencenumber", input.sequenceNumber.toString());
      }
      if (input.timestamp) query.set("timestamp", input.timestamp);
      path = `/api/v1/topics/${encodeURIComponent(
        input.topicId,
      )}/messages?${query.toString()}`;
    }
    const data = objectValue(
      await this.request(path),
      "topic messages response",
    );
    const rawMessages = Array.isArray(data.messages) ? data.messages : [];
    const messages: TopicMessage[] = rawMessages.map((raw) => {
      const message = objectValue(raw, "topic message");
      const messageBase64 = stringValue(message.message);
      const messageUtf8 = Buffer.from(messageBase64, "base64").toString("utf8");
      const parsed = parseAuditEvent(messageUtf8);
      return {
        topicId: stringValue(message.topic_id),
        sequenceNumber: bigintValue(message.sequence_number, "sequence_number"),
        consensusTimestamp: stringValue(message.consensus_timestamp),
        payerAccountId: nullableString(message.payer_account_id),
        messageBase64,
        messageUtf8,
        event: parsed.event,
        ...(parsed.validationError
          ? { validationError: parsed.validationError }
          : {}),
        runningHashBase64: stringValue(message.running_hash),
      };
    });
    const links =
      data.links && typeof data.links === "object"
        ? (data.links as Record<string, unknown>)
        : {};
    const next = this.safeNext(links.next);
    return { messages, ...(next ? { next } : {}) };
  }

  async getTransaction(
    transactionId: string,
  ): Promise<MirrorTransaction | null> {
    const mirrorId = toMirrorTransactionId(transactionId);
    const response = await this.request(
      `/api/v1/transactions/${encodeURIComponent(mirrorId)}`,
      true,
    );
    if (!response) return null;
    const data = objectValue(response, "transaction response");
    const transactions = Array.isArray(data.transactions)
      ? data.transactions
      : [];
    const records = transactions.map((item) =>
      objectValue(item, "transaction"),
    );
    const transaction =
      records.find((item) => Number(item.nonce ?? 0) === 0) ?? records[0];
    if (!transaction) return null;

    const transfers = Array.isArray(transaction.transfers)
      ? transaction.transfers.map((raw) => {
          const transfer = objectValue(raw, "HBAR transfer");
          return {
            accountId: nullableString(transfer.account),
            amountTinybar: bigintValue(transfer.amount ?? 0, "transfer.amount"),
            isApproval: booleanValue(transfer.is_approval),
          };
        })
      : [];
    const tokenTransfers = Array.isArray(transaction.token_transfers)
      ? transaction.token_transfers.map((raw) => {
          const transfer = objectValue(raw, "token transfer");
          return {
            tokenId: nullableString(transfer.token_id),
            accountId: nullableString(transfer.account),
            amount: bigintValue(transfer.amount ?? 0, "token transfer amount"),
            isApproval: booleanValue(transfer.is_approval),
          };
        })
      : [];
    const nftTransfers = Array.isArray(transaction.nft_transfers)
      ? transaction.nft_transfers.map((raw) => {
          const transfer = objectValue(raw, "NFT transfer");
          return {
            tokenId: nullableString(transfer.token_id),
            senderAccountId: nullableString(transfer.sender_account_id),
            receiverAccountId: nullableString(transfer.receiver_account_id),
            serialNumber: bigintValue(
              transfer.serial_number ?? 0,
              "NFT serial_number",
            ),
            isApproval: booleanValue(transfer.is_approval),
          };
        })
      : [];

    return {
      transactionId: stringValue(transaction.transaction_id, mirrorId),
      consensusTimestamp: stringValue(transaction.consensus_timestamp),
      result: stringValue(transaction.result, "UNKNOWN"),
      name: stringValue(transaction.name, "UNKNOWN"),
      memo: decodeBase64Utf8(transaction.memo_base64),
      entityId: nullableString(transaction.entity_id),
      chargedTxFeeTinybar: optionalBigint(
        transaction.charged_tx_fee,
        "charged_tx_fee",
      ),
      transactionHashBase64: nullableString(transaction.transaction_hash),
      scheduled: booleanValue(transaction.scheduled),
      validStartTimestamp: nullableString(transaction.valid_start_timestamp),
      transfers,
      tokenTransfers,
      nftTransfers,
    };
  }

  async waitForTransaction(
    transactionId: string,
    timeoutMs = this.config.mirrorVerificationTimeoutMs,
  ): Promise<MirrorTransaction | null> {
    if (timeoutMs <= 0) return this.getTransaction(transactionId);
    const deadline = Date.now() + timeoutMs;
    do {
      const transaction = await this.getTransaction(transactionId);
      if (transaction) return transaction;
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await this.sleepImplementation(
        Math.min(this.config.mirrorPollIntervalMs, remaining),
      );
    } while (Date.now() < deadline);
    return null;
  }
}
