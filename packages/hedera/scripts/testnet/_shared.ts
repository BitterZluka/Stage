import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  JsonFileIdempotencyStore,
  StageHedera,
  loadStageHederaConfig,
} from "../../src/index.js";

export interface ScriptState {
  fungibleTokenId?: string;
  nftTokenId?: string;
  topicId?: string;
  lastTransactionId?: string;
  lastTokenTransactionId?: string;
  lastRewardTransactionId?: string;
  lastAuditTransactionId?: string;
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`Required environment variable is missing: ${name}`);
  return value;
}

export function envBigInt(name: string, fallback?: bigint): bigint {
  const value = process.env[name]?.trim();
  if (!value) {
    if (fallback !== undefined) return fallback;
    throw new Error(
      `Required integer environment variable is missing: ${name}`,
    );
  }
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be a non-negative base-10 integer`);
  }
  return BigInt(value);
}

export function statePath(): string {
  return resolve(
    process.env.STAGE_HEDERA_STATE_FILE ?? ".stage-hedera/testnet-state.json",
  );
}

export async function loadState(): Promise<ScriptState> {
  try {
    return JSON.parse(await readFile(statePath(), "utf8")) as ScriptState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export async function saveState(
  patch: Partial<ScriptState>,
): Promise<ScriptState> {
  const path = statePath();
  const next = { ...(await loadState()), ...patch };
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryPath, path);
  return next;
}

export function createScriptContext(): {
  config: ReturnType<typeof loadStageHederaConfig>;
  hedera: StageHedera;
} {
  const config = loadStageHederaConfig();
  const idempotencyStore = new JsonFileIdempotencyStore(
    resolve(
      process.env.STAGE_HEDERA_IDEMPOTENCY_FILE ??
        ".stage-hedera/idempotency.json",
    ),
  );
  return {
    config,
    hedera: new StageHedera({ config, idempotencyStore }),
  };
}

function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export function printResult(value: object | unknown[]): void {
  console.log(JSON.stringify(value, jsonReplacer, 2));
}

export function consensusTimestampToIso(value: string): string {
  const match = value.match(/^(\d+)\.(\d{1,9})$/);
  if (!match?.[1] || !match[2]) {
    throw new Error(`Invalid Hedera consensus timestamp: ${value}`);
  }
  const milliseconds =
    Number(match[1]) * 1_000 +
    Math.floor(Number(match[2].padEnd(9, "0")) / 1_000_000);
  return new Date(milliseconds).toISOString();
}

export async function run(main: () => Promise<void>): Promise<void> {
  try {
    await main();
  } catch (error) {
    const serializable =
      error && typeof error === "object" && "toJSON" in error
        ? (error as { toJSON(): unknown }).toJSON()
        : { message: error instanceof Error ? error.message : String(error) };
    console.error(JSON.stringify(serializable, jsonReplacer, 2));
    process.exitCode = 1;
  }
}
