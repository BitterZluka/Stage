import assert from "node:assert/strict";
import { test } from "node:test";
import { PrivateKey } from "@hashgraph/sdk";
import { Wallet as EthersWallet } from "ethers";
import type { MirrorNodeClient } from "../src/mirror-node.js";
import { HederaWalletSignatureVerifier } from "../src/wallet-signature-verifier.js";

function walletMessage(message: string): Buffer {
  return Buffer.from(
    `\x19Hedera Signed Message:\n${message.length}${message}`,
    "utf8",
  );
}

test("verifies a Hedera wallet message signature against the Mirror account key", async () => {
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
    identity: "0.0.123",
    message,
    signature: Buffer.from(privateKey.sign(walletMessage(message))).toString(
      "base64",
    ),
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
    identity: "0.0.123",
    message: "expected message",
    signature: Buffer.from(
      privateKey.sign(walletMessage("different message")),
    ).toString("base64"),
  });

  assert.equal(result.valid, false);
});

test("verifies MetaMask personal_sign and resolves the canonical Hedera account", async () => {
  const privateKey = PrivateKey.generateECDSA();
  const wallet = new EthersWallet(`0x${privateKey.toStringRaw()}`);
  const message = "Creator Platform MetaMask login";
  const mirrorNode = {
    getAccountIdentity: async (identity: string) => {
      assert.equal(identity, wallet.address.toLowerCase());
      return {
        accountId: "0.0.456",
        evmAddress: wallet.address,
        keyType: "ECDSA_SECP256K1",
        publicKey: privateKey.publicKey.toString(),
      };
    },
  } as unknown as MirrorNodeClient;
  const verifier = new HederaWalletSignatureVerifier(mirrorNode);

  const result = await verifier.verify({
    identity: wallet.address.toLowerCase(),
    message,
    signature: await wallet.signMessage(message),
  });

  assert.equal(result.valid, true);
  assert.equal(result.accountId, "0.0.456");
});

test("verifies MetaMask for a Hedera hollow account without a key", async () => {
  const wallet = EthersWallet.createRandom();
  const message = "Creator Platform hollow account login";
  const mirrorNode = {
    getAccountIdentity: async () => ({
      accountId: "0.0.789",
      evmAddress: wallet.address,
      keyType: null,
      publicKey: null,
    }),
  } as unknown as MirrorNodeClient;
  const verifier = new HederaWalletSignatureVerifier(mirrorNode);

  const result = await verifier.verify({
    identity: wallet.address.toLowerCase(),
    message,
    signature: await wallet.signMessage(message),
  });

  assert.equal(result.valid, true);
  assert.equal(result.accountId, "0.0.789");
  assert.equal(result.publicKey, null);
});
