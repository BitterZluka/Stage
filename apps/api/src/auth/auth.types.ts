export interface WalletSignatureVerifier {
  verify(input: {
    identity: string;
    message: string;
    signature: string;
  }): Promise<{
    valid: boolean;
    accountId: string;
    publicKey: string | null;
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
