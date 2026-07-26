import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseService } from "../database/database.service.js";
import type { TokenBalanceReader } from "../token-balances/token-balance-reader.js";
import type { TokenPaymentReader } from "../token-balances/token-payment-reader.js";
import { ClaimService } from "./claim.service.js";

const claimRow = {
  id: "claim-1",
  perkId: "perk-1",
  claimantId: "fan-1",
  status: "CLAIMED",
  fulfillmentNote: null,
  fulfilledAt: null,
  version: 1,
  createdAt: new Date("2026-07-26T01:00:00.000Z"),
  updatedAt: new Date("2026-07-26T01:00:00.000Z"),
  perk: {
    title: "Private livestream",
    description: "Access to a creator-only livestream.",
    creator: {
      displayName: "Perk Test",
      handle: "perk-test",
      token: { symbol: "PRK" },
    },
  },
  purchase: {
    id: "purchase-1",
    status: "CONFIRMED",
    accountId: "0.0.123",
    tokenId: "0.0.456",
    destinationAccountId: "0.0.789",
    amount: "100",
    transactionReference: `0x${"12".repeat(32)}`,
    consensusTimestamp: "1784992342.000000000",
  },
};

function createService() {
  const database = {
    claim: {
      findMany: async () => [claimRow],
    },
    perk: {
      findUnique: async () => ({
        creator: { ownerUserId: "creator-1" },
      }),
    },
  } as unknown as DatabaseService;
  const balances: TokenBalanceReader = {
    async getTokenBalance() {
      return { associated: true, balance: 1_000n };
    },
  };
  const payments: TokenPaymentReader = {
    async verify() {
      return {
        status: "confirmed",
        consensusTimestamp: "1784992342.000000000",
      };
    },
  };
  return new ClaimService(database, balances, payments);
}

test("own claim history includes perk and confirmed Hedera payment", async () => {
  const page = await createService().listOwn("fan-1", { limit: 20 });
  const claim = page.items[0];

  assert.equal(claim?.perk?.title, "Private livestream");
  assert.equal(claim?.perk?.creatorName, "Perk Test");
  assert.equal(claim?.perk?.tokenSymbol, "PRK");
  assert.equal(claim?.payment?.amount, "100");
  assert.equal(claim?.payment?.payerAccountId, "0.0.123");
  assert.equal(claim?.payment?.transactionReference, `0x${"12".repeat(32)}`);
});

test("creator claim lists omit the buyer's Hedera payment", async () => {
  const page = await createService().listForCreator("perk-1", "creator-1", {
    limit: 20,
  });
  const claim = page.items[0];

  assert.equal(claim?.perk?.title, "Private livestream");
  assert.ok(claim);
  assert.equal("payment" in claim, false);
});
