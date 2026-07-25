"use client";

import { useMemo } from "react";
import { ApiWorldService } from "@creator-platform/api-client";
import { SelfieCheckButton } from "../../components/world/selfie-check-button";
import { SurfaceCard } from "../../components/ui/surface-card";

export default function EligibilityPage() {
  const service = useMemo(
    () =>
      new ApiWorldService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );

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
          Complete a quick Selfie Check to reduce bots and duplicate reward
          claims.
        </p>
        <p className="mb-8 text-sm text-gray-500">
          Stage does not store your selfie. Authentication, Hedera wallet
          ownership, and World verification remain separate checks.
        </p>
        <SelfieCheckButton service={service} />
      </SurfaceCard>
    </div>
  );
}
