import {
  createScriptContext,
  envBigInt,
  printResult,
  run,
  saveState,
} from "./_shared.js";

run(async () => {
  const { hedera } = createScriptContext();
  try {
    const result = await hedera.createNftCollection({
      idempotencyKey: "stage:testnet:claim-nft:v1",
      name: process.env.STAGE_NFT_NAME ?? "Stage Claim",
      symbol: process.env.STAGE_NFT_SYMBOL ?? "STGCLM",
      maxSupply: envBigInt("STAGE_NFT_MAX_SUPPLY", 10_000n),
      memo: "Stage claim NFT v1",
    });
    await saveState({
      nftTokenId: result.tokenId,
      lastTransactionId: result.transactionId,
    });
    printResult(result);
  } finally {
    hedera.close();
  }
});
