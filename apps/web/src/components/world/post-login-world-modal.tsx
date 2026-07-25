"use client";

import { ApiWorldService } from "@creator-platform/api-client";
import { useMemo } from "react";
import { useAuth } from "../../auth/auth-provider";
import { CloseIcon } from "../icons";
import { SelfieCheckButton } from "./selfie-check-button";

export function PostLoginWorldModal() {
  const {
    session,
    worldVerificationLoading,
    worldVerified,
    worldVerificationDismissed,
    dismissWorldVerification,
    markWorldVerified,
  } = useAuth();
  const worldService = useMemo(
    () =>
      new ApiWorldService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );
  const open =
    session !== null &&
    !worldVerificationLoading &&
    !worldVerified &&
    !worldVerificationDismissed;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-login-title"
        className="w-full max-w-md rounded-3xl border-2 border-black bg-white shadow-offset"
      >
        <div className="flex items-start justify-between gap-4 rounded-t-3xl border-b-2 border-black bg-gradient-to-br from-stage-aqua to-stage-pink p-6">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.2em] uppercase">
              Wallet connected
            </p>
            <h2
              id="world-login-title"
              className="font-display text-2xl font-bold"
            >
              Prove you are a real person
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              Complete a quick World Selfie Check to unlock reward eligibility.
              This protects creator rewards from bots and duplicate accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissWorldVerification}
            aria-label="Close World verification"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-white transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <ol className="grid grid-cols-2 gap-3 text-sm font-bold">
            <li className="rounded-xl border-2 border-black bg-stage-mint px-3 py-2">
              1. Wallet verified
            </li>
            <li className="rounded-xl border-2 border-black bg-stage-yellow px-3 py-2">
              2. Selfie Check
            </li>
          </ol>

          <p className="text-sm text-gray-600">
            STAGE receives a privacy-preserving verification result, not your
            selfie. Your wallet login and World verification remain separate
            security checks.
          </p>

          <SelfieCheckButton
            service={worldService}
            onVerified={markWorldVerified}
            buttonLabel="Continue with World"
          />
        </div>
      </section>
    </div>
  );
}
