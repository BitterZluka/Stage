"use client";

import {
  ApiAuthService,
  ApiWorldService,
  type CompleteOnboardingInput,
  type SessionView,
} from "@creator-platform/api-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  connectHederaWallet,
  disconnectHederaWallet,
  signHederaMessage,
} from "../lib/hedera-wallet";
import { connectMetaMask, signMetaMaskMessage } from "../lib/metamask-wallet";

export type WalletKind = "hedera" | "metamask";

interface LoginOptions {
  onWalletModalOpening?: () => void;
}

interface AuthContextValue {
  session: SessionView | null;
  loading: boolean;
  authenticating: boolean;
  worldVerificationLoading: boolean;
  worldVerified: boolean;
  worldVerificationDismissed: boolean;
  login: (wallet: WalletKind, options?: LoginOptions) => Promise<void>;
  completeOnboarding: (input: CompleteOnboardingInput) => Promise<void>;
  beginWorldVerification: () => void;
  dismissWorldVerification: () => void;
  markWorldVerified: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useMemo(
    () =>
      new ApiAuthService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );
  const worldService = useMemo(
    () =>
      new ApiWorldService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );
  const [session, setSession] = useState<SessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [worldVerificationLoading, setWorldVerificationLoading] =
    useState(false);
  const [worldVerified, setWorldVerified] = useState(false);
  const [worldVerificationDismissed, setWorldVerificationDismissed] =
    useState(false);

  useEffect(() => {
    let active = true;

    void authService
      .getSession()
      .then((currentSession) => {
        if (active) {
          setWorldVerificationLoading(currentSession !== null);
          setSession(currentSession);
        }
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authService]);

  useEffect(() => {
    let active = true;
    if (!session) {
      setWorldVerificationLoading(false);
      setWorldVerified(false);
      return;
    }

    setWorldVerificationLoading(true);
    void worldService
      .getVerification()
      .then((status) => {
        if (active) {
          setWorldVerified((current) => current || status.verified);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setWorldVerificationLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, worldService]);

  const login = useCallback(
    async (wallet: WalletKind, options?: LoginOptions) => {
      setAuthenticating(true);
      try {
        let challengeId: string;
        let signature: string;
        if (wallet === "metamask") {
          const address = await connectMetaMask();
          const challenge = await authService.requestLoginMessage(address);
          challengeId = challenge.challengeId;
          signature = await signMetaMaskMessage(address, challenge.message);
        } else {
          const accountId = await connectHederaWallet(
            options?.onWalletModalOpening,
          );
          const challenge = await authService.requestLoginMessage(accountId);
          challengeId = challenge.challengeId;
          signature = await signHederaMessage(accountId, challenge.message);
        }
        const newSession = await authService.createSession({
          challengeId,
          signature,
        });
        setWorldVerified(false);
        setWorldVerificationLoading(true);
        setWorldVerificationDismissed(false);
        setSession(newSession);
      } finally {
        setAuthenticating(false);
      }
    },
    [authService],
  );

  const logout = useCallback(async () => {
    try {
      await authService.signOut();
    } finally {
      setSession(null);
      setWorldVerified(false);
      setWorldVerificationLoading(false);
      setWorldVerificationDismissed(false);
      await disconnectHederaWallet().catch(() => undefined);
    }
  }, [authService]);

  const completeOnboarding = useCallback(
    async (input: CompleteOnboardingInput) => {
      setSession(await authService.completeOnboarding(input));
    },
    [authService],
  );

  const beginWorldVerification = useCallback(() => {
    setWorldVerificationDismissed(false);
  }, []);

  const dismissWorldVerification = useCallback(() => {
    setWorldVerificationDismissed(true);
  }, []);

  const markWorldVerified = useCallback(() => {
    setWorldVerified(true);
    setWorldVerificationLoading(false);
    setWorldVerificationDismissed(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      authenticating,
      worldVerificationLoading,
      worldVerified,
      worldVerificationDismissed,
      login,
      completeOnboarding,
      beginWorldVerification,
      dismissWorldVerification,
      markWorldVerified,
      logout,
    }),
    [
      session,
      loading,
      authenticating,
      worldVerificationLoading,
      worldVerified,
      worldVerificationDismissed,
      login,
      completeOnboarding,
      beginWorldVerification,
      dismissWorldVerification,
      markWorldVerified,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
