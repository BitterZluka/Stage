import {
  createScriptContext,
  loadState,
  printResult,
  requireEnv,
  run,
  saveState,
} from "./_shared.js";

run(async () => {
  const state = await loadState();
  const tokenId =
    process.env.STAGE_NFT_TOKEN_ID ??
    state.nftTokenId ??
    requireEnv("STAGE_NFT_TOKEN_ID");
  const { hedera } = createScriptContext();
  try {
    const result = await hedera.mintNft({
      idempotencyKey: `stage:testnet:nft-mint:${requireEnv(
        "STAGE_NFT_MINT_ID",
      )}:v1`,
      tokenId,
      metadata:
        process.env.STAGE_NFT_METADATA ??
        '{"name":"Stage Claim","type":"perk"}',
    });
    await saveState({ lastTransactionId: result.transactionId });
    printResult(result);
  } finally {
    hedera.close();
  }
});
