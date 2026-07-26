"use client";

import type {
  EvmAddress,
  HederaAccountId,
  HederaTokenId,
} from "@creator-platform/shared";

interface EthereumProvider {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  request(input: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<unknown>;
}

export interface MetaMaskTokenAssociationResult {
  transactionHash: string;
  addedToWallet: boolean;
}

function getMetaMask(): EthereumProvider {
  const injected = (window as unknown as { ethereum?: EthereumProvider })
    .ethereum;
  const provider =
    injected?.providers?.find((candidate) => candidate.isMetaMask) ?? injected;

  if (!provider?.isMetaMask) {
    throw new Error("MetaMask is not installed in this browser.");
  }
  return provider;
}

function errorCode(error: unknown): number | undefined {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
    ? error.code
    : undefined;
}

function tokenFacadeAddress(tokenId: HederaTokenId): EvmAddress {
  const match = /^0\.0\.(\d+)$/.exec(tokenId);
  if (!match?.[1]) {
    throw new Error("The creator token has an invalid Hedera token ID.");
  }
  const tokenNumber = BigInt(match[1]);
  if (tokenNumber > 0xffff_ffff_ffff_ffffn) {
    throw new Error("The creator token ID is outside the supported range.");
  }
  return `0x${tokenNumber.toString(16).padStart(40, "0")}` as EvmAddress;
}

function mirrorNodeUrl(): string {
  return (
    process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL ??
    "https://testnet.mirrornode.hedera.com"
  ).replace(/\/+$/, "");
}

async function requireTestnetToken(tokenId: HederaTokenId): Promise<{
  symbol: string;
  decimals: number;
}> {
  const response = await fetch(
    `${mirrorNodeUrl()}/api/v1/tokens/${encodeURIComponent(tokenId)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) {
    throw new Error(
      `Creator token ${tokenId} does not exist on Hedera testnet. It must be provisioned by the real Hedera worker before participants can associate it.`,
    );
  }
  if (!response.ok) {
    throw new Error(
      "Hedera Mirror Node could not verify the creator token. Try again shortly.",
    );
  }
  const body = (await response.json()) as {
    symbol?: unknown;
    decimals?: unknown;
  };
  const decimals = Number(body.decimals);
  if (
    typeof body.symbol !== "string" ||
    body.symbol.length === 0 ||
    body.symbol.length > 11 ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 255
  ) {
    throw new Error(
      "The creator token metadata is not compatible with MetaMask.",
    );
  }
  return { symbol: body.symbol, decimals };
}

async function isTokenAssociated(
  accountId: HederaAccountId,
  tokenId: HederaTokenId,
): Promise<boolean> {
  const query = new URLSearchParams({ "token.id": tokenId, limit: "1" });
  const response = await fetch(
    `${mirrorNodeUrl()}/api/v1/accounts/${encodeURIComponent(accountId)}/tokens?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) return false;
  const body = (await response.json()) as {
    tokens?: Array<{ token_id?: unknown }>;
  };
  return body.tokens?.some((token) => token.token_id === tokenId) ?? false;
}

async function canonicalHederaAccountId(
  address: EvmAddress,
): Promise<HederaAccountId> {
  const response = await fetch(
    `${mirrorNodeUrl()}/api/v1/accounts/${encodeURIComponent(address)}?transactions=false`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(
      "The selected MetaMask account could not be resolved on Hedera testnet.",
    );
  }
  const body = (await response.json()) as { account?: unknown };
  if (typeof body.account !== "string" || !/^0\.0\.\d+$/.test(body.account)) {
    throw new Error(
      "The selected MetaMask account does not have a canonical Hedera testnet account.",
    );
  }
  return body.account as HederaAccountId;
}

async function selectHederaTestnet(provider: EthereumProvider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x128" }],
    });
  } catch (error) {
    if (errorCode(error) !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x128",
          chainName: "Hedera Testnet",
          nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
          rpcUrls: [
            process.env.NEXT_PUBLIC_HEDERA_EVM_RPC_URL ??
              "https://testnet.hashio.io/api",
          ],
          blockExplorerUrls: ["https://hashscan.io/testnet"],
        },
      ],
    });
  }
}

export async function connectMetaMask(): Promise<EvmAddress> {
  const provider = getMetaMask();
  await selectHederaTestnet(provider);
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const account = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof account !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
    throw new Error("MetaMask did not provide a valid EVM address.");
  }
  return account as EvmAddress;
}

export async function signMetaMaskMessage(
  address: EvmAddress,
  message: string,
): Promise<string> {
  const signature = await getMetaMask().request({
    method: "personal_sign",
    params: [message, address],
  });
  if (
    typeof signature !== "string" ||
    !/^0x[a-fA-F0-9]{130}$/.test(signature)
  ) {
    throw new Error("MetaMask returned an invalid signature.");
  }
  return signature;
}

export async function associateMetaMaskToken(
  expectedAccountId: HederaAccountId,
  tokenId: HederaTokenId,
): Promise<MetaMaskTokenAssociationResult> {
  const provider = getMetaMask();
  await selectHederaTestnet(provider);
  const address = await connectMetaMask();
  const resolvedAccountId = await canonicalHederaAccountId(address);
  if (resolvedAccountId !== expectedAccountId) {
    throw new Error(
      "Select the same MetaMask account that is logged in to STAGE, then try again.",
    );
  }
  const token = await requireTestnetToken(tokenId);

  const transactionHash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: address,
        to: tokenFacadeAddress(tokenId),
        // HRC-719 associate(): the caller associates itself with this HTS token.
        data: "0x0a754de6",
      },
    ],
  });
  if (
    typeof transactionHash !== "string" ||
    !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)
  ) {
    throw new Error("MetaMask returned an invalid transaction hash.");
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await isTokenAssociated(expectedAccountId, tokenId)) {
      let addedToWallet = false;
      try {
        addedToWallet =
          (await provider.request({
            method: "wallet_watchAsset",
            params: {
              type: "ERC20",
              options: {
                address: tokenFacadeAddress(tokenId),
                symbol: token.symbol,
                decimals: token.decimals,
              },
            },
          })) === true;
      } catch {
        // Association has already succeeded. Declining or failing the optional
        // display prompt must not report the Hedera transaction as failed.
      }
      return { transactionHash, addedToWallet };
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1_500));
  }
  throw new Error(
    `Transaction ${transactionHash} was submitted, but Mirror Node has not confirmed the token association yet. Check it on HashScan before retrying.`,
  );
}
