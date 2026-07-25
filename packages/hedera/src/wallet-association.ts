import {
  AccountId,
  Client,
  Hbar,
  TokenAssociateTransaction,
  TokenId,
  TransactionId,
} from "@hashgraph/sdk";
import type { ParsedStageHederaConfig } from "./config.js";
import type {
  PreparedTokenAssociation,
  PrepareTokenAssociationInput,
} from "./types.js";
import { explorerTransactionUrl, invalidInput } from "./utils.js";

export async function prepareTokenAssociationTransaction(
  client: Client,
  config: ParsedStageHederaConfig,
  input: PrepareTokenAssociationInput,
): Promise<PreparedTokenAssociation> {
  if (input.tokenIds.length === 0) {
    invalidInput(
      "tokenIds must contain at least one token ID",
      "prepareTokenAssociation",
    );
  }
  const accountId = AccountId.fromString(input.accountId);
  const tokenIds = input.tokenIds.map((tokenId) => TokenId.fromString(tokenId));
  const transaction = new TokenAssociateTransaction()
    .setAccountId(accountId)
    .setTokenIds(tokenIds)
    .setTransactionId(TransactionId.generate(accountId))
    .setMaxTransactionFee(new Hbar(input.maxTransactionFeeHbar ?? 2));
  if (input.nodeAccountIds) {
    if (input.nodeAccountIds.length === 0) {
      invalidInput(
        "nodeAccountIds must not be empty when provided",
        "prepareTokenAssociation",
      );
    }
    transaction.setNodeAccountIds(
      input.nodeAccountIds.map(AccountId.fromString),
    );
  }

  await transaction.freezeWith(client);
  const transactionId = transaction.transactionId?.toString();
  if (!transactionId) {
    throw new Error("Hedera SDK did not produce a wallet transaction ID");
  }
  return {
    transactionId,
    accountId: accountId.toString(),
    tokenIds: tokenIds.map((tokenId) => tokenId.toString()),
    transactionBytesBase64: Buffer.from(transaction.toBytes()).toString(
      "base64",
    ),
    explorerUrl: explorerTransactionUrl(
      config.publicConfig.explorerBaseUrl,
      transactionId,
    ),
    signingResponsibility: "user_wallet",
  };
}
