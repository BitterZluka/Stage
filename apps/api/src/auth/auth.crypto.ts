import { createHash, randomBytes } from "node:crypto";

export function randomOpaqueValue(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildWalletLoginMessage(input: {
  accountId: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
  appUrl: string;
  network: string;
}): string {
  const url = new URL(input.appUrl);
  return [
    `${url.host} wants you to sign in to Creator Platform with your Hedera account:`,
    input.accountId,
    "",
    "Sign this message to authenticate. This request does not submit a transaction or cost HBAR.",
    "",
    `URI: ${url.origin}`,
    "Version: 1",
    `Network: ${input.network}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt.toISOString()}`,
    `Expiration Time: ${input.expiresAt.toISOString()}`,
  ].join("\n");
}
