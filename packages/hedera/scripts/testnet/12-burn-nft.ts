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
    process.env.STAGE_NFT_TOKEN_ID ??
    state.nftTokenId ??
    requireEnv("STAGE_NFT_TOKEN_ID");
  const serialNumber = envBigInt("STAGE_NFT_SERIAL_TO_BURN");
  const { hedera } = createScriptContext();
  try {
    const ownerBeforeBurn = await hedera.getNftOwner(tokenId, serialNumber);
    const result = await hedera.burnNft({
      idempotencyKey: `stage:testnet:nft-burn:${tokenId}:${serialNumber.toString()}:v1`,
      tokenId,
      serialNumbers: [serialNumber],
    });
    await saveState({ lastTransactionId: result.transactionId });
    printResult({ ownerBeforeBurn, result });
  } finally {
    hedera.close();
  }
});
