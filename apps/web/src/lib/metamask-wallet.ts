"use client";

import type { EvmAddress } from "@creator-platform/shared";

interface EthereumProvider {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
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
