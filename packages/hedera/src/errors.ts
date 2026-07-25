import type { NormalizedTransactionStatus } from "./types.js";

export type StageHederaErrorCode =
  | "CONFIGURATION_ERROR"
  | "INVALID_INPUT"
  | "INSUFFICIENT_BALANCE"
  | "TOKEN_NOT_ASSOCIATED"
  | "TOKEN_ALREADY_ASSOCIATED"
  | "INVALID_SIGNATURE"
  | "RECEIPT_FAILURE"
  | "MIRROR_NODE_ERROR"
  | "MIRROR_NODE_NOT_FOUND"
  | "IDEMPOTENCY_CONFLICT"
  | "IDEMPOTENCY_INDETERMINATE"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface StageHederaErrorOptions {
  code: StageHederaErrorCode;
  message: string;
  operation: string;
  status?: NormalizedTransactionStatus;
  transactionId?: string;
  receiptStatus?: string;
  retryable: boolean;
  context?: Record<string, unknown>;
  cause?: unknown;
}

export class StageHederaError extends Error {
  readonly code: StageHederaErrorCode;
  readonly operation: string;
  readonly status: NormalizedTransactionStatus;
  readonly transactionId: string | undefined;
  readonly receiptStatus: string | undefined;
  readonly retryable: boolean;
  readonly context: Record<string, unknown> | undefined;
  override readonly cause: unknown;

  constructor(options: StageHederaErrorOptions) {
    super(options.message);
    this.name = "StageHederaError";
    this.code = options.code;
    this.operation = options.operation;
    this.status = options.status ?? "failed";
    this.transactionId = options.transactionId;
    this.receiptStatus = options.receiptStatus;
    this.retryable = options.retryable;
    this.context = options.context;
    this.cause = options.cause;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      operation: this.operation,
      status: this.status,
      transactionId: this.transactionId,
      receiptStatus: this.receiptStatus,
      retryable: this.retryable,
      context: this.context,
    };
  }
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function textOf(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value) {
    return String(value);
  }
  return undefined;
}

function receiptStatusOf(error: unknown): string | undefined {
  const record = recordOf(error);
  return (
    textOf(record?.status) ??
    textOf(recordOf(record?.receipt)?.status) ??
    textOf(recordOf(record?.response)?.status)
  );
}

function transactionIdOf(error: unknown): string | undefined {
  return textOf(recordOf(error)?.transactionId);
}

export function normalizeHederaError(
  error: unknown,
  operation: string,
  context: { transactionId?: string } = {},
): StageHederaError {
  if (error instanceof StageHederaError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const receiptStatus = receiptStatusOf(error);
  const searchable = `${receiptStatus ?? ""} ${message}`.toUpperCase();
  const transactionId = context.transactionId ?? transactionIdOf(error);

  let code: StageHederaErrorCode = "RECEIPT_FAILURE";
  let retryable = false;
  let status: NormalizedTransactionStatus = "failed";

  if (searchable.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {
    code = "TOKEN_NOT_ASSOCIATED";
  } else if (searchable.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
    code = "TOKEN_ALREADY_ASSOCIATED";
  } else if (
    searchable.includes("INSUFFICIENT_TOKEN_BALANCE") ||
    searchable.includes("INSUFFICIENT_PAYER_BALANCE") ||
    searchable.includes("INSUFFICIENT_ACCOUNT_BALANCE")
  ) {
    code = "INSUFFICIENT_BALANCE";
  } else if (searchable.includes("INVALID_SIGNATURE")) {
    code = "INVALID_SIGNATURE";
  } else if (
    searchable.includes("INVALID_ACCOUNT_ID") ||
    searchable.includes("INVALID_TOKEN_ID") ||
    searchable.includes("INVALID_TOPIC_ID") ||
    searchable.includes("INVALID_NFT_ID")
  ) {
    code = "INVALID_INPUT";
  } else if (
    searchable.includes("BUSY") ||
    searchable.includes("PLATFORM_TRANSACTION_NOT_CREATED")
  ) {
    code = "NETWORK_ERROR";
    retryable = true;
  } else if (
    searchable.includes("TIMEOUT") ||
    searchable.includes("ABORT") ||
    searchable.includes("ECONNRESET") ||
    searchable.includes("FETCH FAILED") ||
    searchable.includes("UNAVAILABLE")
  ) {
    code = "NETWORK_ERROR";
    retryable = true;
    status = transactionId ? "indeterminate" : "failed";
  }

  return new StageHederaError({
    code,
    message: `Hedera ${operation} failed: ${receiptStatus ?? message}`,
    operation,
    status,
    retryable,
    ...(transactionId ? { transactionId } : {}),
    ...(receiptStatus ? { receiptStatus } : {}),
    cause: error,
  });
}
