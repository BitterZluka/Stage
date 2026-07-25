import { Client, Hbar } from "@hashgraph/sdk";
import type { ParsedStageHederaConfig } from "./config.js";

export function createInternalTestnetClient(
  config: ParsedStageHederaConfig,
): Client {
  const client = Client.forTestnet();
  client.setOperator(config.operatorAccountId, config.operatorPrivateKey);
  client.setDefaultMaxTransactionFee(
    new Hbar(config.publicConfig.maxTransactionFeeHbar),
  );
  client.setDefaultMaxQueryPayment(
    new Hbar(config.publicConfig.maxQueryPaymentHbar),
  );
  client.setRequestTimeout(config.publicConfig.requestTimeoutMs);
  client.setMaxAttempts(config.publicConfig.maxAttempts);
  client.setMinBackoff(250);
  client.setMaxBackoff(2_000);
  return client;
}
