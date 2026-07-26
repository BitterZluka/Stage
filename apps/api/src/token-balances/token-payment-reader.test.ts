import assert from "node:assert/strict";
import test from "node:test";
import type {
  MirrorContractResult,
  MirrorTransaction,
} from "@creator-platform/hedera";
import {
  encodeErc20Transfer,
  hederaAccountEvmAddress,
  hederaTokenEvmAddress,
} from "@creator-platform/shared";
import {
  matchesEvmTokenPayment,
  matchesNativeTokenPayment,
} from "./token-payment-reader.js";

const expectation = {
  payerAccountId: "0.0.1234",
  destinationAccountId: "0.0.9701476",
  tokenId: "0.0.4567",
  amount: "25",
};

function nativeTransaction(): MirrorTransaction {
  return {
    transactionId: "0.0.1234@1784992341.091545577",
    consensusTimestamp: "1784992342.000000000",
    result: "SUCCESS",
    name: "CRYPTOTRANSFER",
    memo: null,
    entityId: null,
    chargedTxFeeTinybar: 1n,
    transactionHashBase64: null,
    scheduled: false,
    validStartTimestamp: "1784992341.091545577",
    transfers: [],
    tokenTransfers: [
      {
        tokenId: expectation.tokenId,
        accountId: expectation.payerAccountId,
        amount: -25n,
        isApproval: false,
      },
      {
        tokenId: expectation.tokenId,
        accountId: expectation.destinationAccountId,
        amount: 25n,
        isApproval: false,
      },
    ],
    nftTransfers: [],
  };
}

test("native payment requires the exact token transfer pair", () => {
  assert.equal(
    matchesNativeTokenPayment(nativeTransaction(), expectation),
    true,
  );
  assert.equal(
    matchesNativeTokenPayment(nativeTransaction(), {
      ...expectation,
      amount: "26",
    }),
    false,
  );
});

test("EVM payment requires the exact sender, token facade, and calldata", () => {
  const payer = "0x1111111111111111111111111111111111111111";
  const destination = "0x2222222222222222222222222222222222222222";
  const result: MirrorContractResult = {
    hash: `0x${"12".repeat(32)}`,
    from: payer,
    to: hederaTokenEvmAddress(expectation.tokenId),
    functionParameters: encodeErc20Transfer(
      destination,
      expectation.amount,
    ),
    result: "SUCCESS",
    status: 1,
    consensusTimestamp: "1784992342.000000000",
    logs: [],
  };
  assert.equal(
    matchesEvmTokenPayment(result, expectation, payer, destination),
    true,
  );
  assert.equal(
    matchesEvmTokenPayment(
      {
        ...result,
        from: hederaAccountEvmAddress(expectation.payerAccountId),
      },
      expectation,
      payer,
      destination,
    ),
    true,
  );
  assert.equal(
    matchesEvmTokenPayment(
      {
        ...result,
        functionParameters: encodeErc20Transfer(
          hederaTokenEvmAddress(expectation.tokenId),
          "24",
        ),
      },
      expectation,
      payer,
      destination,
    ),
    false,
  );
  assert.equal(matchesEvmTokenPayment(result, expectation, payer), false);
});
