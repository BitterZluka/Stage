import {
  consensusTimestampToIso,
  createScriptContext,
  loadState,
  printResult,
  requireEnv,
  run,
  saveState,
} from "./_shared.js";

run(async () => {
  const state = await loadState();
  const topicId =
    process.env.STAGE_HCS_TOPIC_ID ??
    state.topicId ??
    requireEnv("STAGE_HCS_TOPIC_ID");
  const eventId = requireEnv("STAGE_AUDIT_EVENT_ID");
  const { hedera } = createScriptContext();
  try {
    const rewardTransaction = state.lastRewardTransactionId
      ? await hedera.getTransaction(state.lastRewardTransactionId)
      : null;
    const occurredAt =
      process.env.STAGE_AUDIT_OCCURRED_AT ??
      (rewardTransaction?.consensusTimestamp
        ? consensusTimestampToIso(rewardTransaction.consensusTimestamp)
        : undefined);
    if (!occurredAt) {
      throw new Error(
        "STAGE_AUDIT_OCCURRED_AT is required when no reward consensus timestamp is available",
      );
    }
    const result = await hedera.publishAuditEvent({
      idempotencyKey: `stage:testnet:audit:${eventId}:v1`,
      topicId,
      event: {
        schema: "ethglobal.audit",
        version: 1,
        eventId,
        eventType:
          (process.env.STAGE_AUDIT_EVENT_TYPE as "reward_paid" | undefined) ??
          "reward_paid",
        occurredAt,
        ...(process.env.STAGE_AUDIT_CREATOR_ID
          ? { creatorId: process.env.STAGE_AUDIT_CREATOR_ID }
          : {}),
        ...(state.lastRewardTransactionId
          ? { transactionId: state.lastRewardTransactionId }
          : {}),
        publicData: { network: "testnet" },
      },
    });
    await saveState({
      lastTransactionId: result.transactionId,
      lastAuditTransactionId: result.transactionId,
    });
    printResult(result);
  } finally {
    hedera.close();
  }
});
