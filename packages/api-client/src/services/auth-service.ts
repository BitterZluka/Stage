import type { EvmAddress, HederaAccountId } from "@creator-platform/shared";
import type { SessionView } from "../contracts.js";

export interface AuthService {
  requestLoginMessage(accountId: HederaAccountId | EvmAddress): Promise<{
    challengeId: string;
    message: string;
    expiresAt: string;
  }>;
  createSession(input: {
    challengeId: string;
    signature: string;
  }): Promise<SessionView>;
  getSession(): Promise<SessionView | null>;
  signOut(): Promise<void>;
}
