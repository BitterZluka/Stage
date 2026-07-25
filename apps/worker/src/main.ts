import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@creator-platform/database";
import {
  JsonFileIdempotencyStore,
  loadStageHederaConfig,
  MockHederaProvider,
  SdkHederaProvider,
} from "@creator-platform/hedera";
import type {
  AuditEventId,
  CreatorId,
  HederaAccountId,
  HederaProvider,
  HederaTokenId,
  IdempotencyKey,
  IsoTimestamp,
  JsonObject,
  TokenAmount,
  TransactionId,
} from "@creator-platform/shared";

export const workerConfig = {
  pollIntervalMs: Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 5_000),
  maxAttempts: Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 5),
} as const;

function createProvider(): HederaProvider {
  if (process.env.HEDERA_PROVIDER !== "real") return new MockHederaProvider();
  return new SdkHederaProvider({
    config: loadStageHederaConfig(),
    idempotencyStore: new JsonFileIdempotencyStore(
      resolve(process.cwd(), ".stage-hedera-idempotency.json"),
    ),
  });
}

function operation(
  key: string,
  signer: "operator" | "treasury",
  attempt: number,
) {
  return {
    idempotencyKey: key as IdempotencyKey,
    correlationId: randomUUID(),
    requestedAt: new Date().toISOString() as IsoTimestamp,
    signer,
    retry: { attempt, maxAttempts: workerConfig.maxAttempts },
  };
}

async function claimNext(database: PrismaClient) {
  return database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "OutboxEvent"
       WHERE "status" = 'PENDING' AND "availableAt" <= NOW()
       ORDER BY "createdAt"
       FOR UPDATE SKIP LOCKED
       LIMIT 1`,
    );
    const id = rows[0]?.id;
    if (!id) return null;
    return transaction.outboxEvent.update({
      where: { id },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
  });
}

async function processReward(
  database: PrismaClient,
  provider: HederaProvider,
  event: {
    id: string;
    aggregateId: string;
    idempotencyKey: string;
    attempts: number;
  },
): Promise<void> {
  const payout = await database.rewardPayout.findUnique({
    where: { id: event.aggregateId },
    include: {
      recipient: { include: { wallets: { orderBy: { verifiedAt: "desc" } } } },
      reservation: {
        include: {
          submission: true,
          challenge: {
            include: { creator: { include: { token: true } } },
          },
        },
      },
    },
  });
  if (!payout) throw new Error("Reward payout does not exist");
  if (payout.status === "CONFIRMED") return;
  const tokenId = payout.reservation.challenge.creator.token?.hederaTokenId;
  const recipientAccountId = payout.recipient.wallets[0]?.accountId;
  const treasuryAccountId = process.env.HEDERA_TREASURY_ACCOUNT_ID;
  if (!tokenId || !recipientAccountId || !treasuryAccountId) {
    throw new Error(
      "Reward transfer requires a creator token, recipient wallet, and treasury account",
    );
  }

  const request = {
    tokenId,
    fromAccountId: treasuryAccountId,
    toAccountId: recipientAccountId,
    amount: payout.amount,
  };
  const requestHash = createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex");
  await database.blockchainTransaction.upsert({
    where: { idempotencyKey: event.idempotencyKey },
    create: {
      idempotencyKey: event.idempotencyKey,
      operationType: "CHALLENGE_REWARD_TRANSFER",
      requestHash,
      status: "PROCESSING",
      attempts: 1,
    },
    update: { status: "PROCESSING", attempts: { increment: 1 } },
  });
  await database.rewardPayout.update({
    where: { id: payout.id },
    data: { status: "PROCESSING" },
  });

  const result = await provider.transferCredits({
    operation: operation(event.idempotencyKey, "treasury", event.attempts),
    tokenId: tokenId as HederaTokenId,
    fromAccountId: treasuryAccountId as HederaAccountId,
    toAccountId: recipientAccountId as HederaAccountId,
    amount: payout.amount as TokenAmount,
  });
  if (result.status !== "success") {
    throw new Error(`Hedera transfer ended with status ${result.status}`);
  }
  await database.$transaction([
    database.blockchainTransaction.update({
      where: { idempotencyKey: event.idempotencyKey },
      data: {
        status: "CONFIRMED",
        hederaTransactionId: result.transactionId,
        result: { status: result.status },
      },
    }),
    database.rewardPayout.update({
      where: { id: payout.id },
      data: {
        status: "CONFIRMED",
        transactionId: result.transactionId,
        confirmedAt: new Date(),
      },
    }),
    database.rewardReservation.update({
      where: { id: payout.reservationId },
      data: { status: "CONFIRMED" },
    }),
    database.auditEvent.create({
      data: {
        eventType: "RewardPayoutConfirmed",
        entityId: payout.id,
        payload: {
          payoutId: payout.id,
          challengeId: payout.reservation.challengeId,
          submissionId: payout.reservation.submissionId,
          transactionId: result.transactionId,
        },
        publicPayload: {
          challengeId: payout.reservation.challengeId,
          transactionId: result.transactionId,
        },
      },
    }),
    database.outboxEvent.create({
      data: {
        idempotencyKey: `reward-hcs:${payout.id}`,
        eventType: "HCS_REWARD_CONFIRMED",
        aggregateId: payout.id,
        payload: {
          challengeId: payout.reservation.challengeId,
          creatorId: payout.reservation.challenge.creatorId,
          transactionId: result.transactionId,
        },
      },
    }),
  ]);
}

async function processHcs(
  provider: HederaProvider,
  event: {
    id: string;
    aggregateId: string;
    eventType: string;
    idempotencyKey: string;
    attempts: number;
    payload: unknown;
  },
): Promise<void> {
  const topicId =
    process.env.HEDERA_AUDIT_TOPIC_ID ?? process.env.HEDERA_HCS_TOPIC_ID;
  if (!topicId) return;
  const source =
    typeof event.payload === "object" && event.payload !== null
      ? (event.payload as Record<string, unknown>)
      : {};
  const eventType =
    event.eventType === "HCS_CHALLENGE_PUBLISHED"
      ? "challenge_published"
      : "reward_paid";
  const publicData: JsonObject = {
    challengeId: String(source.challengeId ?? event.aggregateId),
  };
  if (typeof source.transactionId === "string") {
    publicData.transactionId = source.transactionId;
  }
  await provider.submitHcsAuditMessage({
    operation: operation(event.idempotencyKey, "operator", event.attempts),
    topicId,
    payload: {
      schema: "ethglobal.audit",
      version: 1,
      eventId: event.id as AuditEventId,
      eventType,
      occurredAt: new Date().toISOString() as IsoTimestamp,
      ...(typeof source.creatorId === "string"
        ? { creatorId: source.creatorId as CreatorId }
        : {}),
      ...(typeof source.transactionId === "string"
        ? { transactionId: source.transactionId as TransactionId }
        : {}),
      publicData,
    },
  });
}

async function markFailed(
  database: PrismaClient,
  event: {
    id: string;
    aggregateId: string;
    eventType: string;
    idempotencyKey: string;
    attempts: number;
  },
  error: unknown,
): Promise<void> {
  const terminal = event.attempts >= workerConfig.maxAttempts;
  const message = error instanceof Error ? error.message : String(error);
  await database.$transaction(async (transaction) => {
    await transaction.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: terminal ? "FAILED" : "PENDING",
        availableAt: new Date(
          Date.now() + Math.min(60_000, 2 ** event.attempts * 1_000),
        ),
      },
    });
    if (event.eventType === "CHALLENGE_REWARD_REQUESTED") {
      await transaction.rewardPayout.updateMany({
        where: { id: event.aggregateId },
        data: { status: terminal ? "FAILED" : "PENDING" },
      });
      await transaction.blockchainTransaction.updateMany({
        where: { idempotencyKey: event.idempotencyKey },
        data: {
          status: terminal ? "FAILED" : "PENDING",
          lastErrorCode: message.slice(0, 200),
        },
      });
    }
  });
}

export async function processOneOutboxEvent(
  database: PrismaClient,
  provider: HederaProvider,
): Promise<boolean> {
  const event = await claimNext(database);
  if (!event) return false;
  try {
    if (event.eventType === "CHALLENGE_REWARD_REQUESTED") {
      await processReward(database, provider, event);
    } else if (
      event.eventType === "HCS_CHALLENGE_PUBLISHED" ||
      event.eventType === "HCS_REWARD_CONFIRMED"
    ) {
      await processHcs(provider, event);
    }
    await database.outboxEvent.update({
      where: { id: event.id },
      data: { status: "CONFIRMED", publishedAt: new Date() },
    });
  } catch (error) {
    await markFailed(database, event, error);
  }
  return true;
}

async function run(): Promise<void> {
  const database = new PrismaClient();
  const provider = createProvider();
  await database.$connect();
  console.log(
    `Outbox worker started with ${process.env.HEDERA_PROVIDER === "real" ? "real" : "mock"} Hedera provider`,
  );
  for (;;) {
    const processed = await processOneOutboxEvent(database, provider);
    if (!processed) {
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, workerConfig.pollIntervalMs),
      );
    }
  }
}

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;
if (entrypoint === import.meta.url) {
  void run();
}
