import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const HEDERA_ACCOUNT_PATTERN = /^0\.0\.\d+$/;

export interface StageWorldSignalInput {
  userId: string;
  hederaAccountId: string;
}

export function canonicalStageWorldSignalPayload(
  input: StageWorldSignalInput,
): string {
  const userId = input.userId.trim();
  const hederaAccountId = input.hederaAccountId.trim();
  if (!userId) throw new TypeError("userId is required");
  if (!HEDERA_ACCOUNT_PATTERN.test(hederaAccountId)) {
    throw new TypeError("hederaAccountId must be a valid Hedera account ID");
  }
  return JSON.stringify({ hederaAccountId, userId });
}

/**
 * Returns a non-reversible, versioned signal. The unhashed user and wallet IDs
 * never cross the World/browser boundary.
 */
export function buildStageWorldSignal(input: StageWorldSignalInput): string {
  const payload = canonicalStageWorldSignalPayload(input);
  const digest = sha256(new TextEncoder().encode(payload));
  return `stage:v1:${bytesToHex(digest)}`;
}
