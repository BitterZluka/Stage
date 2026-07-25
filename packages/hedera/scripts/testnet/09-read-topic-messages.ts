import {
  createScriptContext,
  loadState,
  printResult,
  requireEnv,
  run,
} from "./_shared.js";

run(async () => {
  const state = await loadState();
  const topicId =
    process.env.STAGE_HCS_TOPIC_ID ??
    state.topicId ??
    requireEnv("STAGE_HCS_TOPIC_ID");
  const { hedera } = createScriptContext();
  try {
    printResult(
      await hedera.getTopicMessages({
        topicId,
        order: "desc",
        limit: 25,
      }),
    );
  } finally {
    hedera.close();
  }
});
