import {
  createScriptContext,
  loadState,
  printResult,
  requireEnv,
  run,
} from "./_shared.js";

run(async () => {
  const state = await loadState();
  const tokenId =
    process.env.STAGE_FUNGIBLE_TOKEN_ID ??
    state.fungibleTokenId ??
    requireEnv("STAGE_FUNGIBLE_TOKEN_ID");
  const transactionId =
    state.lastRewardTransactionId ??
    state.lastTokenTransactionId ??
    requireEnv("STAGE_LAST_TRANSACTION_ID");
  const { config, hedera } = createScriptContext();
  try {
    const recipient = process.env.STAGE_RECIPIENT_ACCOUNT_ID?.trim();
    printResult({
      tokenInfo: await hedera.getTokenInfo(tokenId),
      treasuryBalance: await hedera.getTokenBalance(
        config.treasuryAccountId,
        tokenId,
      ),
      recipientBalance: recipient
        ? await hedera.getTokenBalance(recipient, tokenId)
        : null,
      transaction: await hedera.getTransaction(transactionId),
    });
  } finally {
    hedera.close();
  }
});
