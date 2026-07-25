export type WorldErrorCode =
  | "CONFIGURATION_ERROR"
  | "SELFIE_CHECK_UNAVAILABLE"
  | "PROOF_INVALID"
  | "PROOF_EXPIRED"
  | "PROOF_REPLAYED"
  | "ACTION_MISMATCH"
  | "SIGNAL_MISMATCH"
  | "IDENTITY_CONFLICT"
  | "USER_CANCELLED"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "UNKNOWN";

export interface WorldProviderErrorOptions {
  code: WorldErrorCode;
  safeMessage: string;
  retryable: boolean;
  cause?: unknown;
}

export class WorldProviderError extends Error {
  readonly code: WorldErrorCode;
  readonly retryable: boolean;
  readonly safeMessage: string;
  readonly cause?: unknown;

  constructor(options: WorldProviderErrorOptions) {
    super(options.safeMessage);
    this.name = "WorldProviderError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.safeMessage = options.safeMessage;
    this.cause = options.cause;
  }

  toJSON(): {
    name: "WorldProviderError";
    code: WorldErrorCode;
    message: string;
    retryable: boolean;
  } {
    return {
      name: "WorldProviderError",
      code: this.code,
      message: this.safeMessage,
      retryable: this.retryable,
    };
  }
}

export function worldError(
  code: WorldErrorCode,
  safeMessage: string,
  retryable = false,
  cause?: unknown,
): WorldProviderError {
  return new WorldProviderError({
    code,
    safeMessage,
    retryable,
    ...(cause === undefined ? {} : { cause }),
  });
}
