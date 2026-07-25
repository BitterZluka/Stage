import { PrivateKey } from "@hashgraph/sdk";
import type { StageHederaConfig } from "../src/config.js";

export function testConfig(): StageHederaConfig {
  const operatorKey = PrivateKey.generateED25519().toString();
  return {
    network: "testnet",
    operatorAccountId: "0.0.1001",
    operatorPrivateKey: operatorKey,
    treasuryAccountId: "0.0.1001",
    treasuryPrivateKey: operatorKey,
    supplyPrivateKey: PrivateKey.generateED25519().toString(),
    hcsAdminPrivateKey: PrivateKey.generateED25519().toString(),
    hcsSubmitPrivateKey: PrivateKey.generateED25519().toString(),
    mirrorNodeUrl: "https://testnet.mirrornode.hedera.com",
    explorerBaseUrl: "https://hashscan.io/testnet",
    requestTimeoutMs: 15_000,
    receiptTimeoutMs: 1_000,
    maxAttempts: 1,
    mirrorRequestTimeoutMs: 1_000,
    mirrorVerificationTimeoutMs: 0,
    mirrorPollIntervalMs: 1,
    mirrorMaxAttempts: 1,
    maxTransactionFeeHbar: 10,
    maxQueryPaymentHbar: 2,
  };
}

export function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}
