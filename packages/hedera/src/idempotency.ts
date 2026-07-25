import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { StageHederaError } from "./errors.js";
import type { HederaWriteResult } from "./types.js";
import { payloadHash } from "./utils.js";

export type IdempotencyState =
  "prepared" | "submitted" | "completed" | "failed" | "indeterminate";

export interface IdempotencyRecord<TResult = unknown> {
  key: string;
  operation: string;
  payloadHash: string;
  state: IdempotencyState;
  transactionId: string;
  /** Exact signed transaction bytes retained for reconciliation, never logged. */
  transactionBytesBase64: string;
  createdAt: string;
  updatedAt: string;
  result?: TResult;
  error?: Record<string, unknown>;
}

export interface ReserveIdempotencyInput {
  key: string;
  operation: string;
  payloadHash: string;
  transactionId: string;
  transactionBytesBase64: string;
  preparedAt: string;
}

/**
 * Production implementations should make reserve and every transition
 * transactional with the worker's operation ledger.
 */
export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | null>;
  reserve(input: ReserveIdempotencyInput): Promise<IdempotencyRecord>;
  markSubmitted(key: string, submittedAt: string): Promise<void>;
  markCompleted(
    key: string,
    result: unknown,
    completedAt: string,
  ): Promise<void>;
  markFailed(
    key: string,
    error: Record<string, unknown>,
    failedAt: string,
  ): Promise<void>;
  markIndeterminate(
    key: string,
    error: Record<string, unknown>,
    observedAt: string,
  ): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  async get(key: string): Promise<IdempotencyRecord | null> {
    return this.records.get(key) ?? null;
  }

  async reserve(input: ReserveIdempotencyInput): Promise<IdempotencyRecord> {
    const existing = this.records.get(input.key);
    if (existing) return existing;
    const record: IdempotencyRecord = {
      key: input.key,
      operation: input.operation,
      payloadHash: input.payloadHash,
      state: "prepared",
      transactionId: input.transactionId,
      transactionBytesBase64: input.transactionBytesBase64,
      createdAt: input.preparedAt,
      updatedAt: input.preparedAt,
    };
    this.records.set(input.key, record);
    return record;
  }

  async markSubmitted(key: string, submittedAt: string): Promise<void> {
    this.update(key, { state: "submitted", updatedAt: submittedAt });
  }

  async markCompleted(
    key: string,
    result: unknown,
    completedAt: string,
  ): Promise<void> {
    this.update(key, {
      state: "completed",
      updatedAt: completedAt,
      result,
    });
  }

  async markFailed(
    key: string,
    error: Record<string, unknown>,
    failedAt: string,
  ): Promise<void> {
    this.update(key, { state: "failed", updatedAt: failedAt, error });
  }

  async markIndeterminate(
    key: string,
    error: Record<string, unknown>,
    observedAt: string,
  ): Promise<void> {
    this.update(key, { state: "indeterminate", updatedAt: observedAt, error });
  }

  private update(key: string, patch: Partial<IdempotencyRecord>): void {
    const existing = this.records.get(key);
    if (!existing) throw new Error(`Idempotency record not found: ${key}`);
    this.records.set(key, { ...existing, ...patch });
  }
}

interface FileData {
  version: 1;
  records: Record<string, IdempotencyRecord>;
}

/**
 * Script/development store. It is durable across reruns but not a substitute
 * for a transactional database-backed store under concurrent workers.
 */
export class JsonFileIdempotencyStore implements IdempotencyStore {
  constructor(private readonly filePath: string) {}

  async get(key: string): Promise<IdempotencyRecord | null> {
    return (await this.readAll()).records[key] ?? null;
  }

  async reserve(input: ReserveIdempotencyInput): Promise<IdempotencyRecord> {
    const data = await this.readAll();
    const existing = data.records[input.key];
    if (existing) return existing;
    const record: IdempotencyRecord = {
      key: input.key,
      operation: input.operation,
      payloadHash: input.payloadHash,
      state: "prepared",
      transactionId: input.transactionId,
      transactionBytesBase64: input.transactionBytesBase64,
      createdAt: input.preparedAt,
      updatedAt: input.preparedAt,
    };
    data.records[input.key] = record;
    await this.writeAll(data);
    return record;
  }

  async markSubmitted(key: string, submittedAt: string): Promise<void> {
    await this.update(key, { state: "submitted", updatedAt: submittedAt });
  }

  async markCompleted(
    key: string,
    result: unknown,
    completedAt: string,
  ): Promise<void> {
    await this.update(key, {
      state: "completed",
      updatedAt: completedAt,
      result,
    });
  }

  async markFailed(
    key: string,
    error: Record<string, unknown>,
    failedAt: string,
  ): Promise<void> {
    await this.update(key, { state: "failed", updatedAt: failedAt, error });
  }

  async markIndeterminate(
    key: string,
    error: Record<string, unknown>,
    observedAt: string,
  ): Promise<void> {
    await this.update(key, {
      state: "indeterminate",
      updatedAt: observedAt,
      error,
    });
  }

  private async update(
    key: string,
    patch: Partial<IdempotencyRecord>,
  ): Promise<void> {
    const data = await this.readAll();
    const existing = data.records[key];
    if (!existing) throw new Error(`Idempotency record not found: ${key}`);
    data.records[key] = { ...existing, ...patch };
    await this.writeAll(data);
  }

  private async readAll(): Promise<FileData> {
    try {
      const parsed = JSON.parse(
        await readFile(this.filePath, "utf8"),
        (_key, value: unknown) => {
          if (
            value &&
            typeof value === "object" &&
            "$stageBigInt" in (value as Record<string, unknown>)
          ) {
            return BigInt(
              String((value as Record<string, unknown>).$stageBigInt),
            );
          }
          return value;
        },
      ) as FileData;
      if (parsed.version !== 1 || !parsed.records) {
        throw new Error("Unsupported idempotency file format");
      }
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { version: 1, records: {} };
      }
      throw error;
    }
  }

  private async writeAll(data: FileData): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    const serialized = JSON.stringify(
      data,
      (_key, value: unknown) =>
        typeof value === "bigint" ? { $stageBigInt: value.toString() } : value,
      2,
    );
    await writeFile(temporaryPath, `${serialized}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryPath, this.filePath);
  }
}

export async function resolveIdempotency<
  TResult extends HederaWriteResult,
>(input: {
  store: IdempotencyStore;
  key: string;
  operation: string;
  payload: unknown;
}): Promise<TResult | null> {
  const record = await input.store.get(input.key);
  if (!record) return null;
  const expectedHash = payloadHash(input.operation, input.payload);
  if (
    record.operation !== input.operation ||
    record.payloadHash !== expectedHash
  ) {
    throw new StageHederaError({
      code: "IDEMPOTENCY_CONFLICT",
      message:
        "Idempotency key was already reserved for a different operation payload",
      operation: input.operation,
      transactionId: record.transactionId,
      retryable: false,
    });
  }
  if (record.state === "completed" && record.result) {
    return { ...(record.result as TResult), replayed: true };
  }
  throw new StageHederaError({
    code: "IDEMPOTENCY_INDETERMINATE",
    message:
      "The original transaction outcome must be reconciled before another submission",
    operation: input.operation,
    transactionId: record.transactionId,
    status: record.state === "failed" ? "failed" : "indeterminate",
    retryable: false,
    context: { idempotencyState: record.state },
  });
}
