"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "./icons";
import { Button } from "./ui/button";

export interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Role-neutral login modal: a user never chooses "follower" or "creator"
 * here, they just log in. Creator Studio access is decided later by whether
 * the account has a creator profile.
 *
 * This phase has no auth backend wired up yet — submitting only closes the
 * dialog. The future integration point is `AuthService`/`SessionView` from
 * `@creator-platform/api-client` (see `packages/api-client/src/services/auth-service.ts`).
 */
export function LoginModal({ open, onClose }: LoginModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
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
        <h2
          id="login-modal-title"
          className="font-display text-xl font-bold"
        >
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

      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <p className="text-sm text-gray-600">
          One STAGE account is all you need — follow creators, join
          challenges, and start creating whenever you&apos;re ready.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-sm font-bold">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border-2 border-black px-4 py-3 text-sm placeholder:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          />
        </div>

        <Button type="submit" variant="holo" size="md" className="w-full">
          Continue
        </Button>

        <p className="text-center text-xs text-gray-400">
          New here? Continuing creates your account automatically.
        </p>
      </form>
    </dialog>
  );
}
