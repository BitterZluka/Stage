import { AccountId, PrivateKey } from "@hashgraph/sdk";
import { StageHederaError } from "./errors.js";
import type { HederaNetwork } from "./types.js";

export interface StageHederaConfig {
  network: HederaNetwork;
  operatorAccountId: string;
  operatorPrivateKey: string;
  treasuryAccountId: string;
  treasuryPrivateKey: string;
  supplyPrivateKey: string;
  hcsAdminPrivateKey?: string;
  hcsSubmitPrivateKey: string;
  mirrorNodeUrl: string;
  explorerBaseUrl: string;
  requestTimeoutMs: number;
  receiptTimeoutMs: number;
  maxAttempts: number;
  mirrorRequestTimeoutMs: number;
  mirrorVerificationTimeoutMs: number;
  mirrorPollIntervalMs: number;
  mirrorMaxAttempts: number;
  maxTransactionFeeHbar: number;
  maxQueryPaymentHbar: number;
}

export interface ParsedStageHederaConfig {
  publicConfig: StageHederaConfig;
  operatorAccountId: AccountId;
  operatorPrivateKey: PrivateKey;
  treasuryAccountId: AccountId;
  treasuryPrivateKey: PrivateKey;
  supplyPrivateKey: PrivateKey;
  hcsAdminPrivateKey: PrivateKey | null;
  hcsSubmitPrivateKey: PrivateKey;
}

function configurationError(message: string, fields?: string[]): never {
  throw new StageHederaError({
    code: "CONFIGURATION_ERROR",
    message,
    operation: "loadConfiguration",
    retryable: false,
    ...(fields ? { context: { fields } } : {}),
  });
}

function required(env: NodeJS.ProcessEnv, field: string): string {
  const value = env[field]?.trim();
  if (!value)
    configurationError("Required Hedera configuration is missing", [field]);
  return value;
}

function optional(env: NodeJS.ProcessEnv, field: string): string | undefined {
  const value = env[field]?.trim();
  return value ? value : undefined;
}

function positiveNumber(
  env: NodeJS.ProcessEnv,
  field: string,
  fallback: number,
  integer: boolean,
): number {
  const text = optional(env, field);
  const value = text === undefined ? fallback : Number(text);
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    (integer && !Number.isInteger(value))
  ) {
    configurationError(
      `${field} must be a positive ${integer ? "integer" : "number"}`,
      [field],
    );
  }
  return value;
}

function nonNegativeInteger(
  env: NodeJS.ProcessEnv,
  field: string,
  fallback: number,
): number {
  const text = optional(env, field);
  const value = text === undefined ? fallback : Number(text);
  if (!Number.isInteger(value) || value < 0) {
    configurationError(`${field} must be a non-negative integer`, [field]);
  }
  return value;
}

function urlValue(
  env: NodeJS.ProcessEnv,
  field: string,
  fallback: string,
): string {
  const value = optional(env, field) ?? fallback;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      configurationError(`${field} must use HTTP or HTTPS`, [field]);
    }
    return value.replace(/\/+$/, "");
  } catch {
    configurationError(`${field} must be a valid URL`, [field]);
  }
}

function accountId(value: string, field: string): AccountId {
  try {
    return AccountId.fromString(value);
  } catch {
    configurationError(`${field} must be a valid Hedera account ID`, [field]);
  }
}

function privateKey(value: string, field: string): PrivateKey {
  try {
    return PrivateKey.fromString(value);
  } catch {
    configurationError(`${field} must be a valid Hedera private key`, [field]);
  }
}

export function loadStageHederaConfig(
  env: NodeJS.ProcessEnv = process.env,
): StageHederaConfig {
  const network = optional(env, "HEDERA_NETWORK") ?? "testnet";
  if (network !== "testnet") {
    configurationError("Stage supports Hedera Testnet only", [
      "HEDERA_NETWORK",
    ]);
  }

  const operatorAccountId = required(env, "HEDERA_OPERATOR_ACCOUNT_ID");
  const operatorPrivateKey = required(env, "HEDERA_OPERATOR_PRIVATE_KEY");
  const treasuryAccountId =
    optional(env, "HEDERA_TREASURY_ACCOUNT_ID") ?? operatorAccountId;
  const configuredTreasuryKey = optional(env, "HEDERA_TREASURY_PRIVATE_KEY");
  const configuredAdminKey = optional(env, "HEDERA_HCS_ADMIN_PRIVATE_KEY");
  if (treasuryAccountId !== operatorAccountId && !configuredTreasuryKey) {
    configurationError(
      "HEDERA_TREASURY_PRIVATE_KEY is required when treasury and operator accounts differ",
      ["HEDERA_TREASURY_PRIVATE_KEY"],
    );
  }

  const config: StageHederaConfig = {
    network,
    operatorAccountId,
    operatorPrivateKey,
    treasuryAccountId,
    treasuryPrivateKey: configuredTreasuryKey ?? operatorPrivateKey,
    supplyPrivateKey: required(env, "HEDERA_SUPPLY_PRIVATE_KEY"),
    hcsSubmitPrivateKey: required(env, "HEDERA_HCS_SUBMIT_PRIVATE_KEY"),
    mirrorNodeUrl: urlValue(
      env,
      "HEDERA_MIRROR_NODE_URL",
      "https://testnet.mirrornode.hedera.com",
    ),
    explorerBaseUrl: urlValue(
      env,
      "HEDERA_EXPLORER_BASE_URL",
      "https://hashscan.io/testnet",
    ),
    requestTimeoutMs: positiveNumber(
      env,
      "HEDERA_REQUEST_TIMEOUT_MS",
      15_000,
      true,
    ),
    receiptTimeoutMs: positiveNumber(
      env,
      "HEDERA_RECEIPT_TIMEOUT_MS",
      30_000,
      true,
    ),
    maxAttempts: positiveNumber(env, "HEDERA_MAX_ATTEMPTS", 3, true),
    mirrorRequestTimeoutMs: positiveNumber(
      env,
      "HEDERA_MIRROR_REQUEST_TIMEOUT_MS",
      10_000,
      true,
    ),
    mirrorVerificationTimeoutMs: nonNegativeInteger(
      env,
      "HEDERA_MIRROR_VERIFICATION_TIMEOUT_MS",
      15_000,
    ),
    mirrorPollIntervalMs: positiveNumber(
      env,
      "HEDERA_MIRROR_POLL_INTERVAL_MS",
      750,
      true,
    ),
    mirrorMaxAttempts: positiveNumber(
      env,
      "HEDERA_MIRROR_MAX_ATTEMPTS",
      4,
      true,
    ),
    maxTransactionFeeHbar: positiveNumber(
      env,
      "HEDERA_MAX_TRANSACTION_FEE_HBAR",
      10,
      false,
    ),
    maxQueryPaymentHbar: positiveNumber(
      env,
      "HEDERA_MAX_QUERY_PAYMENT_HBAR",
      2,
      false,
    ),
    ...(configuredAdminKey ? { hcsAdminPrivateKey: configuredAdminKey } : {}),
  };

  parseStageHederaConfig(config);
  return config;
}

export function parseStageHederaConfig(
  config: StageHederaConfig,
): ParsedStageHederaConfig {
  if (config.network !== "testnet") {
    configurationError("Stage supports Hedera Testnet only", ["network"]);
  }
  const operator = accountId(config.operatorAccountId, "operatorAccountId");
  const treasury = accountId(config.treasuryAccountId, "treasuryAccountId");
  return {
    publicConfig: config,
    operatorAccountId: operator,
    operatorPrivateKey: privateKey(
      config.operatorPrivateKey,
      "operatorPrivateKey",
    ),
    treasuryAccountId: treasury,
    treasuryPrivateKey: privateKey(
      config.treasuryPrivateKey,
      "treasuryPrivateKey",
    ),
    supplyPrivateKey: privateKey(config.supplyPrivateKey, "supplyPrivateKey"),
    hcsAdminPrivateKey: config.hcsAdminPrivateKey
      ? privateKey(config.hcsAdminPrivateKey, "hcsAdminPrivateKey")
      : null,
    hcsSubmitPrivateKey: privateKey(
      config.hcsSubmitPrivateKey,
      "hcsSubmitPrivateKey",
    ),
  };
}
