import type { JsonObject } from "../domain/primitives.js";

export type ApplicationError =
  | ErrorShape<"VALIDATION_ERROR", false>
  | ErrorShape<"NOT_FOUND", false>
  | ErrorShape<"CONFLICT", false>
  | ErrorShape<"UNAUTHORIZED", false>
  | ErrorShape<"UNAUTHENTICATED", false>
  | ErrorShape<"FORBIDDEN", false>
  | ErrorShape<"RATE_LIMITED", true>
  | ErrorShape<"DEPENDENCY_UNAVAILABLE", true>
  | ErrorShape<"HEDERA_TRANSACTION_FAILED", true>
  | ErrorShape<"HEDERA_OUTCOME_UNKNOWN", true>
  | ErrorShape<"IDEMPOTENCY_CONFLICT", false>
  | ErrorShape<"TOKEN_NOT_ASSOCIATED", false>
  | ErrorShape<"INSUFFICIENT_TOKEN_BALANCE", false>
  | ErrorShape<"WORLD_VERIFICATION_FAILED", false>
  | ErrorShape<"WORLD_PROOF_REPLAYED", false>
  | ErrorShape<"LOGIN_CHALLENGE_INVALID", false>
  | ErrorShape<"SIGNATURE_INVALID", false>
  | ErrorShape<"SIGNATURE_VERIFICATION_UNAVAILABLE", true>
  | ErrorShape<"INTERNAL_ERROR", true>;

export interface ErrorShape<Code extends string, Retryable extends boolean> {
  code: Code;
  message: string;
  retryable: Retryable;
  details?: JsonObject;
}

/** Runtime error wrapper; serialize with `toJSON()` before crossing a boundary. */
export class AppError extends Error {
  readonly value: ApplicationError;

  constructor(value: ApplicationError) {
    super(value.message);
    this.name = "AppError";
    this.value = value;
  }

  toJSON(): ApplicationError {
    return this.value;
  }
}
