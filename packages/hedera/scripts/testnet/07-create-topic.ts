import { createScriptContext, printResult, run, saveState } from "./_shared.js";

run(async () => {
  const { config, hedera } = createScriptContext();
  try {
    const result = await hedera.createTopic({
      idempotencyKey: "stage:testnet:hcs-topic:v2",
      memo: process.env.STAGE_HCS_TOPIC_MEMO ?? "Stage audit events v1",
      adminKey: config.hcsAdminPrivateKey ? "configured" : "none",
    });
    await saveState({
      topicId: result.topicId,
      lastTransactionId: result.transactionId,
    });
    printResult(result);
  } finally {
    hedera.close();
  }
});
