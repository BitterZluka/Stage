import { PublicKey } from "@hashgraph/sdk";
import { computeAddress, getAddress, verifyMessage } from "ethers";
import type { MirrorNodeClient } from "./mirror-node.js";
import type {
  VerifyWalletSignatureInput,
  WalletSignatureVerification,
} from "./types.js";

function prefixWalletMessage(message: string): Buffer {
  return Buffer.from(
    `\x19Hedera Signed Message:\n${message.length}${message}`,
    "utf8",
  );
}

export class HederaWalletSignatureVerifier {
  constructor(private readonly mirrorNode: MirrorNodeClient) {}

  async verify(
    input: VerifyWalletSignatureInput,
  ): Promise<WalletSignatureVerification> {
    if (input.identity.startsWith("0x")) {
      const account = await this.mirrorNode.getAccountIdentity(input.identity);
      let valid = false;
      try {
        const identityAddress = getAddress(input.identity);
        const recoveredAddress = getAddress(
          verifyMessage(input.message, input.signature),
        );
        const mirrorAddress = account.evmAddress
          ? getAddress(account.evmAddress)
          : null;
        const currentKeyMatches =
          account.keyType === null && account.publicKey === null
            ? true
            : Boolean(
                account.keyType?.includes("ECDSA") &&
                  account.publicKey &&
                  getAddress(
                    computeAddress(
                      `0x${PublicKey.fromString(account.publicKey).toStringRaw()}`,
                    ),
                  ) === identityAddress,
              );
        valid =
          recoveredAddress === identityAddress &&
          mirrorAddress === identityAddress &&
          currentKeyMatches;
      } catch {
        valid = false;
      }
      return {
        valid,
        accountId: account.accountId,
        keyType: account.keyType,
        publicKey: account.publicKey,
      };
    }

    const accountKey = await this.mirrorNode.getAccountKey(input.identity);
    let valid = false;
    try {
      const publicKey = PublicKey.fromString(accountKey.publicKey);
      const signature = Buffer.from(input.signature, "base64");
      valid =
        signature.length > 0 &&
        publicKey.verify(prefixWalletMessage(input.message), signature);
    } catch {
      valid = false;
    }
    return {
      valid,
      accountId: accountKey.accountId,
      keyType: accountKey.keyType,
      publicKey: accountKey.publicKey,
    };
  }
}
