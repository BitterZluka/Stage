import assert from "node:assert/strict";
import test from "node:test";
import {
  encodeErc20Transfer,
  hederaAccountEvmAddress,
  hederaTokenEvmAddress,
} from "../src/hedera/evm.js";

test("Hedera entity IDs map to long-zero EVM addresses", () => {
  assert.equal(
    hederaAccountEvmAddress("0.0.9701476"),
    "0x0000000000000000000000000000000000940864",
  );
  assert.equal(
    hederaTokenEvmAddress("0.0.123"),
    "0x000000000000000000000000000000000000007b",
  );
});

test("ERC-20 transfer encoding preserves destination and base-unit amount", () => {
  assert.equal(
    encodeErc20Transfer(
      "0x000000000000000000000000000000000000007b",
      "25",
    ),
    `0xa9059cbb${"7b".padStart(64, "0")}${"19".padStart(64, "0")}`,
  );
});
