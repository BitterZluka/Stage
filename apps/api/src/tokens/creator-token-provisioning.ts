import { Prisma } from "@creator-platform/database";
import { creatorTokenDefinition } from "./creator-token-policy.js";

/**
 * Reserves a creator token and its stable outbox command in the same database
 * transaction. Repeated login and challenge requests reuse both records.
 */
export async function ensureCreatorTokenProvisioning(
  transaction: Prisma.TransactionClient,
  creatorId: string,
  providerMode = process.env.HEDERA_PROVIDER,
): Promise<void> {
  const creator = await transaction.creator.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      handle: true,
      displayName: true,
    },
  });
  if (!creator) return;

  const token = await transaction.creatorToken.upsert({
    where: { creatorId },
    create: {
      creatorId,
      ...creatorTokenDefinition(creator.handle, creator.displayName),
    },
    update: {},
  });
  const idempotencyKey = `creator-token:${creator.id}`;
  if (token.status === "ACTIVE" && token.hederaTokenId) {
    if (providerMode !== "real") return;
    const blockchainTransaction =
      await transaction.blockchainTransaction.findUnique({
        where: { idempotencyKey },
        select: { hederaTransactionId: true },
      });
    if (!blockchainTransaction?.hederaTransactionId?.startsWith("mock-")) {
      return;
    }

    await transaction.creatorToken.update({
      where: { id: token.id },
      data: {
        hederaTokenId: null,
        status: "PENDING",
      },
    });
    await transaction.blockchainTransaction.update({
      where: { idempotencyKey },
      data: {
        status: "PENDING",
        hederaTransactionId: null,
        result: Prisma.DbNull,
        attempts: 0,
        lastErrorCode: null,
      },
    });
    await transaction.outboxEvent.upsert({
      where: { idempotencyKey },
      create: {
        idempotencyKey,
        eventType: "CREATOR_TOKEN_CREATION_REQUESTED",
        aggregateId: token.id,
        payload: {
          creatorId: creator.id,
          creatorTokenId: token.id,
        },
      },
      update: {
        aggregateId: token.id,
        payload: {
          creatorId: creator.id,
          creatorTokenId: token.id,
        },
        status: "PENDING",
        attempts: 0,
        availableAt: new Date(),
        publishedAt: null,
      },
    });
    return;
  }

  await transaction.outboxEvent.upsert({
    where: { idempotencyKey },
    create: {
      idempotencyKey,
      eventType: "CREATOR_TOKEN_CREATION_REQUESTED",
      aggregateId: token.id,
      payload: {
        creatorId: creator.id,
        creatorTokenId: token.id,
      },
    },
    update: {
      aggregateId: token.id,
      payload: {
        creatorId: creator.id,
        creatorTokenId: token.id,
      },
    },
  });
}
