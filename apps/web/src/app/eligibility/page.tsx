"use client";

import { useAuth } from "../../auth/auth-provider";
import { SurfaceCard } from "../../components/ui/surface-card";
import { Button } from "../../components/ui/button";

export default function EligibilityPage() {
  const {
    session,
    worldVerificationLoading,
    worldVerified,
    beginWorldVerification,
  } = useAuth();
  const status = !session
    ? "Connect your wallet to start the STAGE login flow."
    : worldVerificationLoading
      ? "Checking your World verification status…"
      : worldVerified
        ? "Your World Selfie Check is complete."
        : "Complete the World Selfie Check in the login dialog.";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <SurfaceCard accent="var(--color-stage-lavender)" className="p-8">
        <p className="mb-2 text-xs font-bold tracking-[0.2em] uppercase">
          Reward eligibility
        </p>
        <h1 className="font-display mb-4 text-3xl font-bold">
          Keep rewards fair
        </h1>
        <p className="mb-3 text-gray-700">
          Selfie Check now follows wallet verification as part of signing in to
          STAGE.
        </p>
        <p className="mb-8 text-sm text-gray-500">
          Stage does not store your selfie. Authentication, Hedera wallet
          ownership, and World verification remain separate checks.
        </p>
        <div
          aria-live="polite"
          className="rounded-xl border-2 border-black bg-white px-4 py-3 text-sm font-semibold"
        >
          {status}
        </div>
        {session && !worldVerificationLoading && !worldVerified ? (
          <Button
            type="button"
            variant="holo"
            size="lg"
            className="mt-4 w-full"
            onClick={beginWorldVerification}
          >
            Verify with World
          </Button>
        ) : null}
      </SurfaceCard>
    </div>
  );
}
