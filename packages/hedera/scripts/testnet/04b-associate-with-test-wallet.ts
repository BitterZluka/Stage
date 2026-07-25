import {
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  TokenAssociateTransaction,
  TokenId,
  TransactionId,
} from "@hashgraph/sdk";
import { toMirrorTransactionId } from "../../src/utils.js";
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
    process.env.STAGE_FUNGIBLE_TOKEN_ID ??
    state.fungibleTokenId ??
    requireEnv("STAGE_FUNGIBLE_TOKEN_ID");
  const accountId = AccountId.fromString(requireEnv("STAGE_USER_ACCOUNT_ID"));
  const privateKey = PrivateKey.fromString(
    requireEnv("STAGE_USER_PRIVATE_KEY"),
  );
  const { config, hedera } = createScriptContext();
  const userClient = Client.forTestnet()
    .setOperator(accountId, privateKey)
    .setDefaultMaxTransactionFee(new Hbar(2));
  try {
    if (await hedera.isTokenAssociated(accountId.toString(), tokenId)) {
      printResult({
        skipped: true,
        associated: true,
        accountId: accountId.toString(),
        tokenId,
        signingResponsibility: "test_user_wallet",
      });
      return;
    }
    const transaction = new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([TokenId.fromString(tokenId)])
      .setTransactionId(TransactionId.generate(accountId));
    const response = await transaction.execute(userClient);
    const receipt = await response.getReceipt(userClient);
    const transactionId = response.transactionId.toString();
    const mirrored = await hedera.getTransaction(transactionId);
    await saveState({ lastTransactionId: transactionId });
    printResult({
      transactionId,
      receiptStatus: receipt.status.toString(),
      ...(mirrored?.consensusTimestamp
        ? { consensusTimestamp: mirrored.consensusTimestamp }
        : {}),
      explorerUrl: `${config.explorerBaseUrl}/transaction/${encodeURIComponent(
        toMirrorTransactionId(transactionId),
      )}`,
      status: receipt.status.toString() === "SUCCESS" ? "success" : "failed",
      mirrorVerified: mirrored !== null,
      signingResponsibility: "test_user_wallet",
    });
  } finally {
    userClient.close();
    hedera.close();
  }
});
