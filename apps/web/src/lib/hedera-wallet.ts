"use client";

import type { DAppConnector } from "@hashgraph/hedera-wallet-connect";
import type {
  HederaAccountId,
  HederaTokenId,
  TokenAmount,
} from "@creator-platform/shared";

let connectorPromise: Promise<DAppConnector> | undefined;

function getProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "WalletConnect is not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.",
    );
  }
  return projectId;
}

async function getConnector(): Promise<DAppConnector> {
  if (!connectorPromise) {
    connectorPromise = (async () => {
      const [
        {
          DAppConnector,
          HederaChainId,
          HederaJsonRpcMethod,
          HederaSessionEvent,
        },
        { LedgerId },
      ] = await Promise.all([
        import("@hashgraph/hedera-wallet-connect"),
        import("@hiero-ledger/sdk"),
      ]);

      const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK ?? "testnet";
      if (network !== "testnet") {
        throw new Error("Only the Hedera testnet is enabled for this MVP.");
      }

      const origin = window.location.origin;
      const connector = new DAppConnector(
        {
          name: "STAGE",
          description: "STAGE creator community platform",
          url: origin,
          icons: [new URL("/favicon.ico", origin).toString()],
        },
        LedgerId.TESTNET,
        getProjectId(),
        Object.values(HederaJsonRpcMethod),
        [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
        [HederaChainId.Testnet],
        "error",
      );

      await connector.init({ logger: "error" });
      if (!connector.walletConnectClient) {
        throw new Error("WalletConnect could not be initialized.");
      }
      return connector;
    })().catch((error) => {
      connectorPromise = undefined;
      throw error;
    });
  }

  return connectorPromise;
}

export async function connectHederaWallet(
  onModalOpening?: () => void,
): Promise<HederaAccountId> {
  const connector = await getConnector();
  if (connector.signers.length === 0) {
    onModalOpening?.();
    await connector.openModal(undefined, true);
  }

  const signer = connector.signers[0];
  if (!signer) {
    throw new Error("The wallet did not provide a Hedera account.");
  }

  return signer.getAccountId().toString() as HederaAccountId;
}

export async function signHederaMessage(
  accountId: HederaAccountId,
  message: string,
): Promise<string> {
  const connector = await getConnector();
  const response = await connector.signMessage({
    signerAccountId: `hedera:testnet:${accountId}`,
    message,
  });
  const signatureMapBase64 = response.result.signatureMap;
  const { base64StringToSignatureMap, extractFirstSignature } =
    await import("@hashgraph/hedera-wallet-connect");
  const signature = extractFirstSignature(
    base64StringToSignatureMap(signatureMapBase64),
  );

  let binary = "";
  for (const byte of signature) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

export async function associateHederaToken(
  accountId: HederaAccountId,
  tokenId: HederaTokenId,
): Promise<string> {
  const connector = await getConnector();
  const signer = connector.signers.find(
    (candidate) => candidate.getAccountId().toString() === accountId,
  );
  if (!signer) {
    throw new Error(
      "Reconnect with a Hedera WalletConnect wallet to approve token association.",
    );
  }
  const { TokenAssociateTransaction } = await import("@hiero-ledger/sdk");
  const transaction = new TokenAssociateTransaction()
    .setAccountId(accountId)
    .setTokenIds([tokenId]);
  const response = await transaction.executeWithSigner(signer);
  return response.transactionId.toString();
}

export async function spendHederaTokens(
  accountId: HederaAccountId,
  tokenId: HederaTokenId,
  destinationAccountId: HederaAccountId,
  amount: TokenAmount,
): Promise<string> {
  const connector = await getConnector();
  const signer = connector.signers.find(
    (candidate) => candidate.getAccountId().toString() === accountId,
  );
  if (!signer) {
    throw new Error(
      "Reconnect with the Hedera WalletConnect account that is logged in to STAGE.",
    );
  }
  const { TransferTransaction } = await import("@hiero-ledger/sdk");
  const quantity = BigInt(amount);
  const transaction = new TransferTransaction()
    .addTokenTransfer(tokenId, accountId, -quantity)
    .addTokenTransfer(tokenId, destinationAccountId, quantity);
  const response = await transaction.executeWithSigner(signer);
  return response.transactionId.toString();
}

export async function disconnectHederaWallet(): Promise<void> {
  if (!connectorPromise) return;

  const connector = await connectorPromise;
  if (connector.signers.length > 0) {
    await connector.disconnectAll();
  }
}
