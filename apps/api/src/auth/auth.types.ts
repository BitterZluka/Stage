export interface WalletSignatureVerifier {
  verify(input: {
    accountId: string;
    message: string;
    signatureBase64: string;
  }): Promise<{
    valid: boolean;
    accountId: string;
    publicKey: string;
  }>;
}

export interface AuthenticatedUserView {
  id: string;
  accountIds: string[];
}

export interface AuthSessionView {
  user: AuthenticatedUserView;
  expiresAt: string;
}

export const WALLET_SIGNATURE_VERIFIER = Symbol("WALLET_SIGNATURE_VERIFIER");
