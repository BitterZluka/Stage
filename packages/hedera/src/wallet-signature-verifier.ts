import { PublicKey } from "@hashgraph/sdk";
import type { MirrorNodeClient } from "./mirror-node.js";
import type {
  VerifyWalletSignatureInput,
  WalletSignatureVerification,
} from "./types.js";

export class HederaWalletSignatureVerifier {
  constructor(private readonly mirrorNode: MirrorNodeClient) {}

  async verify(
    input: VerifyWalletSignatureInput,
  ): Promise<WalletSignatureVerification> {
    const accountKey = await this.mirrorNode.getAccountKey(input.accountId);
    let valid = false;
    try {
      const publicKey = PublicKey.fromString(accountKey.publicKey);
      const signature = Buffer.from(input.signatureBase64, "base64");
      valid =
        signature.length > 0 &&
        publicKey.verify(Buffer.from(input.message, "utf8"), signature);
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
