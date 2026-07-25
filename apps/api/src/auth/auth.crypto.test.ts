import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWalletLoginMessage, sha256 } from "./auth.crypto.js";

test("buildWalletLoginMessage binds account, origin, network, and expiry", () => {
  const message = buildWalletLoginMessage({
    accountId: "0.0.123",
    nonce: "nonce-value",
    issuedAt: new Date("2026-07-25T12:00:00.000Z"),
    expiresAt: new Date("2026-07-25T12:05:00.000Z"),
    appUrl: "https://creator.example/path",
    network: "testnet",
  });

  assert.match(message, /0\.0\.123/);
  assert.match(message, /URI: https:\/\/creator\.example/);
  assert.match(message, /Network: testnet/);
  assert.match(message, /Nonce: nonce-value/);
  assert.match(message, /Expiration Time: 2026-07-25T12:05:00.000Z/);
});

test("sha256 is deterministic and does not expose the input", () => {
  assert.equal(sha256("session-token"), sha256("session-token"));
  assert.notEqual(sha256("session-token"), "session-token");
  assert.equal(sha256("session-token").length, 64);
});
