import assert from "node:assert/strict";
import { test } from "node:test";
import { PrivateKey } from "@hashgraph/sdk";
import type { MirrorNodeClient } from "../src/mirror-node.js";
import { HederaWalletSignatureVerifier } from "../src/wallet-signature-verifier.js";

test("verifies a raw UTF-8 message signature against the Mirror account key", async () => {
  const privateKey = PrivateKey.generateED25519();
  const message = "Creator Platform login";
  const mirrorNode = {
    getAccountKey: async () => ({
      accountId: "0.0.123",
      keyType: "ED25519",
      publicKey: privateKey.publicKey.toString(),
    }),
  } as unknown as MirrorNodeClient;
  const verifier = new HederaWalletSignatureVerifier(mirrorNode);

  const result = await verifier.verify({
    accountId: "0.0.123",
    message,
    signatureBase64: Buffer.from(
      privateKey.sign(Buffer.from(message, "utf8")),
    ).toString("base64"),
  });

  assert.equal(result.valid, true);
  assert.equal(result.accountId, "0.0.123");
});

test("rejects a signature produced for a different message", async () => {
  const privateKey = PrivateKey.generateED25519();
  const mirrorNode = {
    getAccountKey: async () => ({
      accountId: "0.0.123",
      keyType: "ED25519",
      publicKey: privateKey.publicKey.toString(),
    }),
  } as unknown as MirrorNodeClient;
  const verifier = new HederaWalletSignatureVerifier(mirrorNode);

  const result = await verifier.verify({
    accountId: "0.0.123",
    message: "expected message",
    signatureBase64: Buffer.from(
      privateKey.sign(Buffer.from("different message", "utf8")),
    ).toString("base64"),
  });

  assert.equal(result.valid, false);
});
