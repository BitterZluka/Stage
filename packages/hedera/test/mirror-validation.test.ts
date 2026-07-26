import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryIdempotencyStore } from "../src/idempotency.js";
import { MirrorNodeClient } from "../src/mirror-node.js";
import { StageHedera, assertNftsBurnable } from "../src/stage-hedera.js";
import { StageHederaError } from "../src/errors.js";
import { jsonResponse, testConfig } from "./helpers.js";

test("zero-balance token relationship is still associated", async () => {
  const config = testConfig();
  const mirror = new MirrorNodeClient(config, {
    fetch: async () =>
      jsonResponse({
        tokens: [
          {
            token_id: "0.0.2001",
            balance: "0",
            decimals: 2,
            automatic_association: false,
          },
        ],
      }),
  });
  const balance = await mirror.getTokenBalance("0.0.3001", "0.0.2001");
  assert.equal(balance.balance, 0n);
  assert.equal(balance.associated, true);
  assert.equal(await mirror.isTokenAssociated("0.0.3001", "0.0.2001"), true);
});

test("EVM contract results expose payment verification fields", async () => {
  const config = testConfig();
  const mirror = new MirrorNodeClient(config, {
    fetch: async () =>
      jsonResponse({
        hash: `0x${"12".repeat(32)}`,
        from: "0x0000000000000000000000000000000000000001",
        to: "0x0000000000000000000000000000000000000002",
        function_parameters: "0xa9059cbb",
        result: "SUCCESS",
        status: 1,
        timestamp: "1784992341.091545577",
        logs: [],
      }),
  });
  const result = await mirror.getContractResult(`0x${"12".repeat(32)}`);
  assert.equal(result?.result, "SUCCESS");
  assert.equal(result?.from, "0x0000000000000000000000000000000000000001");
  assert.equal(result?.functionParameters, "0xa9059cbb");
});

test("fungible transfer is rejected before submission when recipient is not associated", async () => {
  const config = testConfig();
  const hedera = new StageHedera({
    config,
    idempotencyStore: new InMemoryIdempotencyStore(),
    fetch: async () => jsonResponse({ tokens: [] }),
  });
  try {
    await assert.rejects(
      hedera.transferFungibleToken({
        idempotencyKey: "reward:unassociated:v1",
        tokenId: "0.0.2001",
        toAccountId: "0.0.3001",
        amount: 1n,
      }),
      (error: unknown) =>
        error instanceof StageHederaError &&
        error.code === "TOKEN_NOT_ASSOCIATED",
    );
  } finally {
    hedera.close();
  }
});

test("NFT burn validation requires treasury ownership", () => {
  assert.throws(
    () =>
      assertNftsBurnable(
        [
          {
            tokenId: "0.0.2001",
            serialNumber: 1n,
            accountId: "0.0.9999",
            deleted: false,
            metadataBase64: "",
            metadataUtf8: null,
            createdTimestamp: null,
            modifiedTimestamp: null,
          },
        ],
        "0.0.1001",
      ),
    (error: unknown) =>
      error instanceof StageHederaError && error.code === "INVALID_INPUT",
  );
});
