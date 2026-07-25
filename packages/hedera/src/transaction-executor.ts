import {
  Client,
  PrivateKey,
  Transaction,
  TransactionId,
  type TransactionReceipt,
} from "@hashgraph/sdk";
import type { ParsedStageHederaConfig } from "./config.js";
import { StageHederaError, normalizeHederaError } from "./errors.js";
import { resolveIdempotency, type IdempotencyStore } from "./idempotency.js";
import type { MirrorNodeClient } from "./mirror-node.js";
import type { HederaWriteResult, MirrorTransaction } from "./types.js";
import {
  explorerTransactionUrl,
  normalizeTransactionStatus,
  payloadHash,
  withTimeout,
} from "./utils.js";

export type SubmitTransaction = (
  transaction: Transaction,
  client: Client,
  receiptTimeoutMs: number,
) => Promise<TransactionReceipt>;

async function defaultSubmitTransaction(
  transaction: Transaction,
  client: Client,
  receiptTimeoutMs: number,
): Promise<TransactionReceipt> {
  const response = await transaction.execute(client);
  return withTimeout(
    response.getReceipt(client),
    receiptTimeoutMs,
    "waitForReceipt",
  );
}

export interface ExecuteTransactionInput<TResult extends HederaWriteResult> {
  operation: string;
  idempotencyKey: string;
  payload: unknown;
  transaction: Transaction;
  signerKeys?: PrivateKey[];
  verifyMirror?(transaction: MirrorTransaction): boolean;
  mapReceipt(receipt: TransactionReceipt, base: HederaWriteResult): TResult;
}

export class TransactionExecutor {
  constructor(
    private readonly config: ParsedStageHederaConfig,
    private readonly client: Client,
    private readonly mirrorNode: MirrorNodeClient,
    private readonly idempotencyStore: IdempotencyStore,
    private readonly submitTransaction: SubmitTransaction = defaultSubmitTransaction,
  ) {}

  resolve<TResult extends HederaWriteResult>(
    operation: string,
    idempotencyKey: string,
    payload: unknown,
  ): Promise<TResult | null> {
    return resolveIdempotency<TResult>({
      store: this.idempotencyStore,
      key: idempotencyKey,
      operation,
      payload,
    });
  }

  async execute<TResult extends HederaWriteResult>(
    options: ExecuteTransactionInput<TResult>,
  ): Promise<TResult> {
    const replay = await this.resolve<TResult>(
      options.operation,
      options.idempotencyKey,
      options.payload,
    );
    if (replay) return replay;

    let transactionId: string | undefined;
    let reserved = false;
    try {
      options.transaction.setTransactionId(
        TransactionId.generate(this.config.operatorAccountId),
      );
      await options.transaction.freezeWith(this.client);
      const keys = [
        this.config.operatorPrivateKey,
        ...(options.signerKeys ?? []),
      ];
      const fingerprints = new Set<string>();
      for (const key of keys) {
        const fingerprint = key.publicKey.toString();
        if (fingerprints.has(fingerprint)) continue;
        fingerprints.add(fingerprint);
        await options.transaction.sign(key);
      }

      transactionId = options.transaction.transactionId?.toString();
      if (!transactionId) {
        throw new StageHederaError({
          code: "UNKNOWN_ERROR",
          message: "Hedera SDK did not produce a transaction ID",
          operation: options.operation,
          retryable: false,
        });
      }

      const preparedAt = new Date().toISOString();
      const record = await this.idempotencyStore.reserve({
        key: options.idempotencyKey,
        operation: options.operation,
        payloadHash: payloadHash(options.operation, options.payload),
        transactionId,
        transactionBytesBase64: Buffer.from(
          options.transaction.toBytes(),
        ).toString("base64"),
        preparedAt,
      });
      if (record.transactionId !== transactionId) {
        const concurrentResult = await this.resolve<TResult>(
          options.operation,
          options.idempotencyKey,
          options.payload,
        );
        if (concurrentResult) return concurrentResult;
        throw new Error("Concurrent idempotency reservation was not resolved");
      }
      reserved = true;
      await this.idempotencyStore.markSubmitted(
        options.idempotencyKey,
        new Date().toISOString(),
      );

      const receipt = await this.submitTransaction(
        options.transaction,
        this.client,
        this.config.publicConfig.receiptTimeoutMs,
      );
      const receiptStatus = receipt.status.toString();
      let mirrorTransaction = null;
      try {
        mirrorTransaction =
          await this.mirrorNode.waitForTransaction(transactionId);
      } catch {
        // The consensus receipt remains authoritative. Mirror indexing is
        // eventual and can be reconciled later by transaction ID.
      }
      const mirrorVerified =
        mirrorTransaction !== null &&
        (options.verifyMirror ? options.verifyMirror(mirrorTransaction) : true);
      const base: HederaWriteResult = {
        transactionId,
        receiptStatus,
        ...(mirrorTransaction?.consensusTimestamp
          ? { consensusTimestamp: mirrorTransaction.consensusTimestamp }
          : {}),
        explorerUrl: explorerTransactionUrl(
          this.config.publicConfig.explorerBaseUrl,
          transactionId,
        ),
        status: normalizeTransactionStatus(receiptStatus),
        mirrorVerified,
        replayed: false,
      };
      const result = options.mapReceipt(receipt, base);
      await this.idempotencyStore.markCompleted(
        options.idempotencyKey,
        result,
        new Date().toISOString(),
      );
      return result;
    } catch (cause) {
      const error = normalizeHederaError(
        cause,
        options.operation,
        transactionId ? { transactionId } : {},
      );
      if (reserved) {
        if (error.status === "indeterminate" || error.retryable) {
          await this.idempotencyStore.markIndeterminate(
            options.idempotencyKey,
            error.toJSON(),
            new Date().toISOString(),
          );
        } else {
          await this.idempotencyStore.markFailed(
            options.idempotencyKey,
            error.toJSON(),
            new Date().toISOString(),
          );
        }
      }
      throw error;
    }
  }
}
