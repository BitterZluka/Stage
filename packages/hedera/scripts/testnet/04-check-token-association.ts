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
  const accountId = requireEnv("STAGE_USER_ACCOUNT_ID");
  const { hedera } = createScriptContext();
  try {
    const associated = await hedera.isTokenAssociated(accountId, tokenId);
    if (associated) {
      printResult({ accountId, tokenId, associated, skipped: true });
      return;
    }
    const prepared = await hedera.prepareTokenAssociationTransaction({
      accountId,
      tokenIds: [tokenId],
    });
    printResult({
      associated: false,
      prepared,
      walletInstruction:
        "The user wallet reconstructs, signs, and submits these transaction bytes. The backend must never receive the user private key.",
    });
  } finally {
    hedera.close();
  }
});
