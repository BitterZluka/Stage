import { Injectable } from "@nestjs/common";
import {
  MirrorNodeClient,
  type MirrorContractResult,
  type MirrorTransaction,
} from "@creator-platform/hedera";
import {
  encodeErc20Transfer,
  hederaAccountEvmAddress,
  hederaTokenEvmAddress,
  normalizeEvmAddress,
} from "@creator-platform/shared";

export interface TokenPaymentExpectation {
  transactionReference: string;
  payerAccountId: string;
  destinationAccountId: string;
  tokenId: string;
  amount: string;
}

export type TokenPaymentVerification =
  | { status: "pending" }
  | { status: "invalid"; reason: string }
  | { status: "confirmed"; consensusTimestamp: string };

export interface TokenPaymentReader {
  verify(
    expectation: TokenPaymentExpectation,
  ): Promise<TokenPaymentVerification>;
}

export const TOKEN_PAYMENT_READER = Symbol("TOKEN_PAYMENT_READER");

function amountFor(
  transaction: MirrorTransaction,
  tokenId: string,
  accountId: string,
): bigint {
  return transaction.tokenTransfers
    .filter(
      (transfer) =>
        transfer.tokenId === tokenId && transfer.accountId === accountId,
    )
    .reduce((total, transfer) => total + transfer.amount, 0n);
}

export function matchesNativeTokenPayment(
  transaction: MirrorTransaction,
  expectation: Omit<TokenPaymentExpectation, "transactionReference">,
): boolean {
  const amount = BigInt(expectation.amount);
  return (
    transaction.result === "SUCCESS" &&
    amountFor(transaction, expectation.tokenId, expectation.payerAccountId) ===
      -amount &&
    amountFor(
      transaction,
      expectation.tokenId,
      expectation.destinationAccountId,
    ) === amount
  );
}

export function matchesEvmTokenPayment(
  result: MirrorContractResult,
  expectation: Omit<TokenPaymentExpectation, "transactionReference">,
  payerEvmAddress: string,
  destinationEvmAddress: string = hederaAccountEvmAddress(
    expectation.destinationAccountId,
  ),
): boolean {
  const tokenAddress = hederaTokenEvmAddress(expectation.tokenId);
  const expectedParameters = encodeErc20Transfer(
    destinationEvmAddress,
    expectation.amount,
  );
  const normalizedFrom = normalizeEvmAddress(result.from);
  const payerMatches =
    normalizedFrom === normalizeEvmAddress(payerEvmAddress) ||
    normalizedFrom ===
      hederaAccountEvmAddress(expectation.payerAccountId);
  return (
    result.result === "SUCCESS" &&
    result.status === 1 &&
    payerMatches &&
    result.to !== null &&
    normalizeEvmAddress(result.to) === tokenAddress &&
    result.functionParameters.toLowerCase() === expectedParameters.toLowerCase()
  );
}

@Injectable()
export class MirrorTokenPaymentReader implements TokenPaymentReader {
  private readonly mirrorNode = new MirrorNodeClient({
    mirrorNodeUrl:
      process.env.HEDERA_MIRROR_NODE_URL ??
      "https://testnet.mirrornode.hedera.com",
    mirrorRequestTimeoutMs: Number(
      process.env.HEDERA_MIRROR_REQUEST_TIMEOUT_MS ?? 10_000,
    ),
    mirrorVerificationTimeoutMs: 0,
    mirrorPollIntervalMs: 750,
    mirrorMaxAttempts: Number(process.env.HEDERA_MIRROR_MAX_ATTEMPTS ?? 4),
  });

  async verify(
    expectation: TokenPaymentExpectation,
  ): Promise<TokenPaymentVerification> {
    const common = {
      payerAccountId: expectation.payerAccountId,
      destinationAccountId: expectation.destinationAccountId,
      tokenId: expectation.tokenId,
      amount: expectation.amount,
    };
    if (/^0x[a-fA-F0-9]{64}$/.test(expectation.transactionReference)) {
      const [result, payer, destination] = await Promise.all([
        this.mirrorNode.getContractResult(expectation.transactionReference),
        this.mirrorNode.getAccountIdentity(expectation.payerAccountId),
        this.mirrorNode.getAccountIdentity(expectation.destinationAccountId),
      ]);
      if (!result) return { status: "pending" };
      if (
        !payer.evmAddress ||
        !matchesEvmTokenPayment(
          result,
          common,
          payer.evmAddress,
          destination.evmAddress ??
            hederaAccountEvmAddress(expectation.destinationAccountId),
        )
      ) {
        return {
          status: "invalid",
          reason:
            "The Hedera transaction does not contain the expected perk token payment",
        };
      }
      return {
        status: "confirmed",
        consensusTimestamp: result.consensusTimestamp,
      };
    }

    const transaction = await this.mirrorNode.getTransaction(
      expectation.transactionReference,
    );
    if (!transaction) return { status: "pending" };
    if (!matchesNativeTokenPayment(transaction, common)) {
      return {
        status: "invalid",
        reason:
          "The Hedera transaction does not contain the expected perk token payment",
      };
    }
    return {
      status: "confirmed",
      consensusTimestamp: transaction.consensusTimestamp,
    };
  }
}
