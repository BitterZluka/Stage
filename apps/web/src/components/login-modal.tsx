"use client";

import { ApiClientError } from "@creator-platform/api-client";
import { useEffect, useRef, useState } from "react";
import { useAuth, type WalletKind } from "../auth/auth-provider";
import { CloseIcon } from "./icons";
import { Button } from "./ui/button";

export interface LoginModalProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "SIGNATURE_INVALID") {
      return "The wallet signature could not be verified. Please try again.";
    }
    if (error.code === "LOGIN_CHALLENGE_INVALID") {
      return "The login request expired. Please try again.";
    }
    if (error.code === "WALLET_ACCOUNT_NOT_FOUND") {
      return "This MetaMask account is not funded on Hedera testnet yet.";
    }
    return error.message;
  }
  if (error instanceof Error) {
    if (/reject|cancel|closed/i.test(error.message)) {
      return "The wallet request was cancelled.";
    }
    return error.message;
  }
  return "Login failed. Please try again.";
}

export function LoginModal({ open, onOpen, onClose }: LoginModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { login, authenticating } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [activeWallet, setActiveWallet] = useState<WalletKind | null>(null);

  async function handleLogin(wallet: WalletKind) {
    setError(null);
    setActiveWallet(wallet);
    let walletModalOpened = false;
    try {
      await login(wallet, {
        onWalletModalOpening: () => {
          walletModalOpened = true;
          onClose();
        },
      });
      onClose();
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
      if (walletModalOpened) {
        onOpen();
      }
    } finally {
      setActiveWallet(null);
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setError(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
      aria-labelledby="login-modal-title"
      className="m-auto w-full max-w-sm rounded-3xl border-2 border-black bg-white p-0 shadow-offset backdrop:bg-black/55 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between rounded-t-3xl border-b-2 border-black bg-gradient-to-br from-stage-aqua to-stage-lavender p-6">
        <h2 id="login-modal-title" className="font-display text-xl font-bold">
          Log in to STAGE
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close login dialog"
          className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-black transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm text-gray-600">
          Connect MetaMask or a native Hedera wallet and sign a one-time
          message. This does not submit a transaction or cost HBAR. After the
          wallet is verified, you will continue with World Selfie Check.
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-xl border-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        <Button
          type="button"
          variant="holo"
          size="md"
          className="w-full"
          disabled={authenticating}
          onClick={() => void handleLogin("metamask")}
        >
          {activeWallet === "metamask"
            ? "Confirm in MetaMask…"
            : "Continue with MetaMask"}
        </Button>

        <Button
          type="button"
          variant="holo"
          size="md"
          className="w-full"
          disabled={authenticating}
          onClick={() => void handleLogin("hedera")}
        >
          {activeWallet === "hedera"
            ? "Confirm in wallet…"
            : "Continue with HashPack / Hedera"}
        </Button>

        <p className="text-center text-xs text-gray-400">
          Your STAGE account is created automatically on first login.
        </p>
      </div>
    </dialog>
  );
}
