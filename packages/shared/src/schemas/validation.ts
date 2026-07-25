import type {
  IdempotencyKey,
  IsoTimestamp,
  JsonObject,
  JsonValue,
  TokenAmount,
} from "../domain/primitives.js";

const TOKEN_AMOUNT_PATTERN = /^(0|[1-9]\d*)$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const FORBIDDEN_HCS_KEY_PATTERN =
  /(^|_)(email|phone|name|address|pii|nullifier|proof|submission|private|signed_?url)($|_)/i;

export function asIsoTimestamp(value: string): IsoTimestamp {
  if (!Number.isFinite(Date.parse(value)) || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    throw new TypeError("Expected an ISO-8601 timestamp");
  }
  return value as IsoTimestamp;
}

export function asTokenAmount(value: string): TokenAmount {
  if (!TOKEN_AMOUNT_PATTERN.test(value)) {
    throw new TypeError("Expected a non-negative decimal integer string");
  }
  return value as TokenAmount;
}

export function asIdempotencyKey(value: string): IdempotencyKey {
  if (!IDEMPOTENCY_KEY_PATTERN.test(value)) {
    throw new TypeError("Invalid idempotency key");
  }
  return value as IdempotencyKey;
}

export function assertHcsSafePublicData(value: JsonObject): void {
  inspect(value, "$");
}

function inspect(value: JsonValue, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_HCS_KEY_PATTERN.test(key)) {
        throw new TypeError(`Forbidden HCS field at ${path}.${key}`);
      }
      inspect(item, `${path}.${key}`);
    }
  }
}

// TODO: Replace these lightweight boundary helpers with shared Zod schemas if
// runtime validation becomes standardized across all package consumers.
