import { Injectable } from "@nestjs/common";
import { MirrorNodeClient } from "@creator-platform/hedera";

export interface TokenBalanceView {
  balance: bigint;
  associated: boolean;
}

export interface TokenBalanceReader {
  getTokenBalance(
    accountId: string,
    tokenId: string,
  ): Promise<TokenBalanceView>;
}

export const TOKEN_BALANCE_READER = Symbol("TOKEN_BALANCE_READER");

@Injectable()
export class MirrorTokenBalanceReader implements TokenBalanceReader {
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

  getTokenBalance(
    accountId: string,
    tokenId: string,
  ): Promise<TokenBalanceView> {
    return this.mirrorNode.getTokenBalance(accountId, tokenId);
  }
}
