import { createHash } from "node:crypto";
import Long from "long";
import { StageHederaError } from "./errors.js";
import type {
  JsonValue,
  NormalizedTransactionStatus,
  StageAuditEvent,
} from "./types.js";

export const HEDERA_INT64_MAX = 9_223_372_036_854_775_807n;
export const NFT_METADATA_MAX_BYTES = 100;
export const STAGE_HCS_MESSAGE_MAX_BYTES = 1_024;

export function invalidInput(message: string, operation = "validation"): never {
  throw new StageHederaError({
    code: "INVALID_INPUT",
    message,
    operation,
    retryable: false,
  });
}

export function assertNonEmpty(
  value: string,
  field: string,
  operation = "validation",
): void {
  if (value.trim().length === 0)
    invalidInput(`${field} must not be empty`, operation);
}

export function assertUtf8Length(
  value: string,
  field: string,
  maximumBytes: number,
  operation: string,
): void {
  if (Buffer.byteLength(value, "utf8") > maximumBytes) {
    invalidInput(
      `${field} must not exceed ${maximumBytes} UTF-8 bytes`,
      operation,
    );
  }
}

export function assertPositiveAmount(
  amount: bigint,
  field = "amount",
  operation = "validation",
): void {
  if (amount <= 0n || amount > HEDERA_INT64_MAX) {
    invalidInput(
      `${field} must be between 1 and ${HEDERA_INT64_MAX.toString()}`,
      operation,
    );
  }
}

export function assertNonNegativeAmount(
  amount: bigint,
  field: string,
  operation: string,
): void {
  if (amount < 0n || amount > HEDERA_INT64_MAX) {
    invalidInput(
      `${field} must be between 0 and ${HEDERA_INT64_MAX.toString()}`,
      operation,
    );
  }
}

export function toLong(value: bigint): Long {
  if (value < 0n || value > HEDERA_INT64_MAX) {
    invalidInput(`Value ${value.toString()} is outside the Hedera int64 range`);
  }
  return Long.fromString(value.toString(), false, 10);
}

export function toNegativeLong(value: bigint): Long {
  return toLong(value).negate();
}

export function longLikeToBigInt(value: unknown): bigint | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value))
    return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  if (typeof value === "object" && "toString" in value) {
    const text = String(value);
    if (/^-?\d+$/.test(text)) return BigInt(text);
  }
  return null;
}

export function normalizeTransactionStatus(
  receiptStatus: string,
): NormalizedTransactionStatus {
  const status = receiptStatus.toUpperCase();
  if (status === "SUCCESS") return "success";
  if (status === "UNKNOWN" || status === "RECEIPT_NOT_FOUND") return "pending";
  return "failed";
}

export function toMirrorTransactionId(transactionId: string): string {
  if (/^\d+\.\d+\.\d+-\d+-\d+(?:-\d+)?$/.test(transactionId)) {
    return transactionId;
  }
  const match = transactionId.match(
    /^(\d+\.\d+\.\d+)@(\d+)\.(\d+)(?:\/(\d+))?(?:\?(?:scheduled|nonce)=?(\d+)?)?$/,
  );
  if (!match) return transactionId;
  const [, accountId, seconds, nanos, slashNonce, queryNonce] = match;
  if (!accountId || !seconds || !nanos) return transactionId;
  const nonce = slashNonce ?? queryNonce;
  return `${accountId}-${seconds}-${nanos.padStart(9, "0")}${nonce ? `-${nonce}` : ""}`;
}

export function explorerTransactionUrl(
  baseUrl: string,
  transactionId: string,
): string {
  return `${baseUrl.replace(/\/$/, "")}/transaction/${encodeURIComponent(
    toMirrorTransactionId(transactionId),
  )}`;
}

function normalizedJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") return { $bigint: value.toString() };
  if (value instanceof Uint8Array) {
    return { $bytesBase64: Buffer.from(value).toString("base64") };
  }
  if (Array.isArray(value)) return value.map(normalizedJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalizedJsonValue(nested)]),
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(normalizedJsonValue(value));
}

export function payloadHash(operation: string, payload: unknown): string {
  return createHash("sha256")
    .update(operation)
    .update("\n")
    .update(stableJson(payload))
    .digest("hex");
}

export function encodeMetadata(
  metadata: Uint8Array | string | JsonValue,
): Uint8Array {
  if (metadata instanceof Uint8Array) return metadata;
  if (typeof metadata === "string") return Buffer.from(metadata, "utf8");
  return Buffer.from(stableJson(metadata), "utf8");
}

const auditEventTypes = new Set([
  "creator_token_created",
  "challenge_published",
  "winner_selected",
  "reward_paid",
  "claim_minted",
  "claim_redeemed",
]);
const prohibitedHcsKey =
  /(email|phone|proof|nullifier|shipping|submission|private.?url|signed.?url|jwt|secret)/i;

function assertSafePublicData(value: unknown, path: string): void {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      invalidInput(`${path} contains a non-finite number`, "publishAuditEvent");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSafePublicData(item, `${path}[${index}]`),
    );
    return;
  }
  if (typeof value !== "object") {
    invalidInput(`${path} is not JSON-serializable`, "publishAuditEvent");
  }
  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (prohibitedHcsKey.test(key)) {
      invalidInput(
        `HCS field ${path}.${key} is prohibited`,
        "publishAuditEvent",
      );
    }
    assertSafePublicData(nested, `${path}.${key}`);
  }
}

export function serializeAuditEvent(event: StageAuditEvent): string {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    invalidInput("Audit event must be an object", "publishAuditEvent");
  }
  const allowedKeys = new Set([
    "schema",
    "version",
    "eventId",
    "eventType",
    "occurredAt",
    "creatorId",
    "transactionId",
    "publicData",
  ]);
  const unknownKeys = Object.keys(event).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    invalidInput(
      `Audit event contains unknown fields: ${unknownKeys.join(", ")}`,
      "publishAuditEvent",
    );
  }
  if (event.schema !== "ethglobal.audit" || event.version !== 1) {
    invalidInput(
      "Audit event schema/version is not supported",
      "publishAuditEvent",
    );
  }
  assertNonEmpty(event.eventId, "event.eventId", "publishAuditEvent");
  if (!auditEventTypes.has(event.eventType)) {
    invalidInput("Audit event type is not allowlisted", "publishAuditEvent");
  }
  if (
    !event.publicData ||
    typeof event.publicData !== "object" ||
    Array.isArray(event.publicData)
  ) {
    invalidInput("event.publicData must be a JSON object", "publishAuditEvent");
  }
  if (event.creatorId !== undefined) {
    assertNonEmpty(event.creatorId, "event.creatorId", "publishAuditEvent");
  }
  if (event.transactionId !== undefined) {
    assertNonEmpty(
      event.transactionId,
      "event.transactionId",
      "publishAuditEvent",
    );
  }
  const timestamp = Date.parse(event.occurredAt);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString() !== event.occurredAt
  ) {
    invalidInput(
      "event.occurredAt must be an explicit UTC ISO-8601 timestamp",
      "publishAuditEvent",
    );
  }
  assertSafePublicData(event.publicData, "event.publicData");
  const serialized = stableJson(event);
  const size = Buffer.byteLength(serialized, "utf8");
  if (size > STAGE_HCS_MESSAGE_MAX_BYTES) {
    invalidInput(
      `Audit event is ${size} bytes; Stage limits one HCS event to ${STAGE_HCS_MESSAGE_MAX_BYTES} bytes`,
      "publishAuditEvent",
    );
  }
  return serialized;
}

export function parseAuditEvent(value: string): {
  event: StageAuditEvent | null;
  validationError?: string;
} {
  try {
    const parsed = JSON.parse(value) as StageAuditEvent;
    serializeAuditEvent(parsed);
    return { event: parsed };
  } catch (error) {
    return {
      event: null,
      validationError:
        error instanceof Error ? error.message : "Invalid audit event",
    };
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new StageHederaError({
                code: "NETWORK_ERROR",
                message: `${operation} timed out after ${timeoutMs}ms`,
                operation,
                status: "indeterminate",
                retryable: true,
              }),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
