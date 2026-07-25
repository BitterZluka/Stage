import assert from "node:assert/strict";
import test from "node:test";
import { loadStageHederaConfig } from "../src/config.js";
import { normalizeHederaError, StageHederaError } from "../src/errors.js";
import { testConfig } from "./helpers.js";

test("configuration validates IDs, keys, URLs, and required signer roles", () => {
  const config = testConfig();
  const loaded = loadStageHederaConfig({
    HEDERA_NETWORK: config.network,
    HEDERA_OPERATOR_ACCOUNT_ID: config.operatorAccountId,
    HEDERA_OPERATOR_PRIVATE_KEY: config.operatorPrivateKey,
    HEDERA_TREASURY_ACCOUNT_ID: config.treasuryAccountId,
    HEDERA_TREASURY_PRIVATE_KEY: config.treasuryPrivateKey,
    HEDERA_SUPPLY_PRIVATE_KEY: config.supplyPrivateKey,
    HEDERA_HCS_ADMIN_PRIVATE_KEY: config.hcsAdminPrivateKey,
    HEDERA_HCS_SUBMIT_PRIVATE_KEY: config.hcsSubmitPrivateKey,
    HEDERA_MIRROR_NODE_URL: config.mirrorNodeUrl,
    HEDERA_EXPLORER_BASE_URL: config.explorerBaseUrl,
  });
  assert.equal(loaded.network, "testnet");
  assert.equal(loaded.operatorAccountId, "0.0.1001");
});

test("configuration errors identify fields without echoing secrets", () => {
  assert.throws(
    () =>
      loadStageHederaConfig({
        HEDERA_NETWORK: "testnet",
        HEDERA_OPERATOR_ACCOUNT_ID: "invalid",
        HEDERA_OPERATOR_PRIVATE_KEY: "secret-that-must-not-appear",
        HEDERA_SUPPLY_PRIVATE_KEY: "invalid",
        HEDERA_HCS_SUBMIT_PRIVATE_KEY: "invalid",
      }),
    (error: unknown) => {
      assert.ok(error instanceof StageHederaError);
      assert.equal(error.code, "CONFIGURATION_ERROR");
      assert.doesNotMatch(error.message, /secret-that-must-not-appear/);
      return true;
    },
  );
});

test("SDK failures are normalized into stable error codes", () => {
  const normalized = normalizeHederaError(
    new Error("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT"),
    "transferFungibleToken",
  );
  assert.equal(normalized.code, "TOKEN_NOT_ASSOCIATED");
  assert.equal(normalized.retryable, false);
  assert.equal(normalized.operation, "transferFungibleToken");
});
