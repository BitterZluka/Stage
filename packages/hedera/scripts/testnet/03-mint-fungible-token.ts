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
    const result = await hedera.mintFungibleToken({
      idempotencyKey: `stage:testnet:mint:${requireEnv("STAGE_MINT_ID")}:v1`,
      tokenId,
      amount: envBigInt("STAGE_MINT_AMOUNT"),
    });
    await saveState({
      lastTransactionId: result.transactionId,
      lastTokenTransactionId: result.transactionId,
    });
    printResult(result);
  } finally {
    hedera.close();
  }
});
