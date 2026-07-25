import {
  createScriptContext,
  envBigInt,
  loadState,
  printResult,
  requireEnv,
  run,
  saveState,
} from "./_shared.js";

run(async () => {
  const state = await loadState();
  const tokenId =
    process.env.STAGE_FUNGIBLE_TOKEN_ID ??
    state.fungibleTokenId ??
    requireEnv("STAGE_FUNGIBLE_TOKEN_ID");
  const { hedera } = createScriptContext();
  try {
    const result = await hedera.transferFungibleToken({
      idempotencyKey: `stage:testnet:reward:${requireEnv("STAGE_REWARD_ID")}:v1`,
      tokenId,
      toAccountId: requireEnv("STAGE_RECIPIENT_ACCOUNT_ID"),
      amount: envBigInt("STAGE_TRANSFER_AMOUNT"),
    });
    await saveState({
      lastTransactionId: result.transactionId,
      lastTokenTransactionId: result.transactionId,
      lastRewardTransactionId: result.transactionId,
    });
    printResult(result);
  } finally {
    hedera.close();
  }
});
