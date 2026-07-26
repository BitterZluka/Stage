import type {
  EvmAddress,
  HederaAccountId,
  HederaTokenId,
  TokenAmount,
} from "../domain/primitives.js";

const MAX_HEDERA_ENTITY_NUMBER = 0xffff_ffff_ffff_ffffn;
const MAX_UINT256 = (1n << 256n) - 1n;

function entityAddress(value: string, label: string): EvmAddress {
  const match = /^0\.0\.(\d+)$/.exec(value);
  if (!match?.[1]) {
    throw new Error(`${label} must be a canonical 0.0.x Hedera ID`);
  }
  const entityNumber = BigInt(match[1]);
  if (entityNumber > MAX_HEDERA_ENTITY_NUMBER) {
    throw new Error(`${label} is outside the supported Hedera entity range`);
  }
  return `0x${entityNumber.toString(16).padStart(40, "0")}` as EvmAddress;
}

export function hederaAccountEvmAddress(
  accountId: HederaAccountId | string,
): EvmAddress {
  return entityAddress(accountId, "accountId");
}

export function hederaTokenEvmAddress(
  tokenId: HederaTokenId | string,
): EvmAddress {
  return entityAddress(tokenId, "tokenId");
}

export function normalizeEvmAddress(value: string): EvmAddress {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error("A 20-byte EVM address is required");
  }
  return value.toLowerCase() as EvmAddress;
}

export function encodeErc20Transfer(
  destination: EvmAddress | string,
  amount: TokenAmount | string,
): `0x${string}` {
  const address = normalizeEvmAddress(destination);
  if (!/^(?:0|[1-9]\d*)$/.test(amount)) {
    throw new Error("Token amount must be a non-negative base-10 integer");
  }
  const value = BigInt(amount);
  if (value > MAX_UINT256) {
    throw new Error("Token amount is outside the uint256 range");
  }
  return `0xa9059cbb${address.slice(2).padStart(64, "0")}${value
    .toString(16)
    .padStart(64, "0")}`;
}
