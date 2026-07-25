import assert from "node:assert/strict";
import test from "node:test";
import { TokenId, TokenMintTransaction } from "@hashgraph/sdk";
import { createInternalTestnetClient } from "../src/client.js";
import { parseStageHederaConfig } from "../src/config.js";
import { InMemoryIdempotencyStore } from "../src/idempotency.js";
import { MirrorNodeClient } from "../src/mirror-node.js";
import { TransactionExecutor } from "../src/transaction-executor.js";
import { StageHederaError } from "../src/errors.js";
import { testConfig } from "./helpers.js";

test("ambiguous SDK submission is retained and cannot create a replacement", async () => {
  const parsed = parseStageHederaConfig(testConfig());
  const client = createInternalTestnetClient(parsed);
  const store = new InMemoryIdempotencyStore();
  const mirror = new MirrorNodeClient(parsed.publicConfig);
  const executor = new TransactionExecutor(
    parsed,
    client,
    mirror,
    store,
    async () => {
      throw new Error("request timeout after submission");
    },
  );
  const payload = { tokenId: "0.0.2001", amount: 1n };
  try {
    await assert.rejects(
      executor.execute({
        operation: "mintFungibleToken",
        idempotencyKey: "mint:ambiguous:v1",
        payload,
        transaction: new TokenMintTransaction()
          .setTokenId(TokenId.fromString("0.0.2001"))
          .setAmount(1),
        signerKeys: [parsed.supplyPrivateKey],
        mapReceipt: (_receipt, base) => ({ ...base, newTotalSupply: null }),
      }),
      (error: unknown) => {
        assert.ok(error instanceof StageHederaError);
        assert.equal(error.status, "indeterminate");
        assert.ok(error.transactionId);
        return true;
      },
    );
    assert.equal(
      (await store.get("mint:ambiguous:v1"))?.state,
      "indeterminate",
    );
    await assert.rejects(
      executor.resolve("mintFungibleToken", "mint:ambiguous:v1", payload),
      (error: unknown) =>
        error instanceof StageHederaError &&
        error.code === "IDEMPOTENCY_INDETERMINATE",
    );
  } finally {
    client.close();
  }
});
