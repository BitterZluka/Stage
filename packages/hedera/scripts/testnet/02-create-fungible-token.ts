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
    const result = await hedera.createFungibleToken({
      idempotencyKey: "stage:testnet:fungible-token:v1",
      name: process.env.STAGE_TOKEN_NAME ?? "Stage Creator Credit",
      symbol: process.env.STAGE_TOKEN_SYMBOL ?? "STAGEC",
      decimals: Number(process.env.STAGE_TOKEN_DECIMALS ?? "2"),
      initialSupply: envBigInt("STAGE_TOKEN_INITIAL_SUPPLY", 0n),
      supplyType: "INFINITE",
      memo: "Stage fungible creator rewards v1",
    });
    await saveState({
      fungibleTokenId: result.tokenId,
      lastTransactionId: result.transactionId,
      lastTokenTransactionId: result.transactionId,
    });
    printResult(result);
  } finally {
    hedera.close();
  }
});
