"use client";

import { useEffect, useState } from "react";
import type { WorldService } from "@creator-platform/api-client";
import { ApiClientError } from "@creator-platform/api-client";
import {
  createFakeSelfieCheckProof,
  createSelfieCheckRequest,
  worldClientErrorState,
  type SelfieCheckRequestConfig,
} from "@stage/world/client";
import type {
  WorldProviderName,
  WorldVerificationUiState,
} from "@stage/world/shared";
import { Button } from "../ui/button";
import { SelfieCheckModal } from "./selfie-check-modal";
import { SelfieCheckStatus } from "./selfie-check-status";
import { WorldVerificationError } from "./world-verification-error";

const BUSY_STATES = new Set<WorldVerificationUiState>([
  "requesting_context",
  "opening_world",
  "waiting_for_proof",
  "verifying_on_backend",
]);

function backendErrorState(error: unknown): WorldVerificationUiState {
  if (!(error instanceof ApiClientError)) return "unavailable";
  if (error.code === "PROOF_REPLAYED" || error.code === "IDENTITY_CONFLICT") {
    return "duplicate";
  }
  if (error.code === "PROOF_EXPIRED") return "expired";
  if (
    error.code === "CONFIGURATION_ERROR" ||
    error.code === "UNAUTHENTICATED" ||
    error.code === "WALLET_REQUIRED"
  ) {
    return "configuration_error";
  }
  if (
    error.code === "PROOF_INVALID" ||
    error.code === "ACTION_MISMATCH" ||
    error.code === "SIGNAL_MISMATCH"
  ) {
    return "invalid_proof";
  }
  return "unavailable";
}

export function SelfieCheckButton({
  service,
  onVerified,
  buttonLabel = "Verify eligibility",
}: {
  service: WorldService;
  onVerified?: () => void;
  buttonLabel?: string;
}) {
  const [state, setState] = useState<WorldVerificationUiState>("not_verified");
  const [provider, setProvider] = useState<WorldProviderName>();
  const [request, setRequest] = useState<SelfieCheckRequestConfig>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void service
      .getVerification()
      .then((status) => {
        if (!active) return;
        setProvider(status.provider);
        setState(status.verified ? "verified" : "not_verified");
        if (status.verified) onVerified?.();
      })
      .catch(() => {
        if (active) setState("not_verified");
      });
    return () => {
      active = false;
    };
  }, [service, onVerified]);

  async function start(): Promise<void> {
    setState("requesting_context");
    try {
      const context = await service.requestVerification();
      setProvider(context.provider);
      if (context.provider === "fake") {
        setState("verifying_on_backend");
        const status = await service.completeVerification({
          proof: createFakeSelfieCheckProof(context),
        });
        setState(status.verified ? "verified" : "invalid_proof");
        if (status.verified) onVerified?.();
        return;
      }
      setRequest(createSelfieCheckRequest(context));
      setState("opening_world");
      setOpen(true);
    } catch (error) {
      setState(backendErrorState(error));
    }
  }

  const busy = BUSY_STATES.has(state);
  return (
    <div className="flex flex-col gap-4">
      <SelfieCheckStatus state={state} provider={provider} />
      <WorldVerificationError state={state} />
      {state !== "verified" ? (
        <Button
          type="button"
          variant="holo"
          size="lg"
          disabled={busy}
          onClick={() => void start()}
        >
          {busy ? "Checking…" : buttonLabel}
        </Button>
      ) : null}
      {request ? (
        <SelfieCheckModal
          request={request}
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) {
              setState("waiting_for_proof");
            } else if (
              state !== "verified" &&
              state !== "verifying_on_backend"
            ) {
              setState("cancelled");
            }
          }}
          onVerify={async (proof) => {
            setState("verifying_on_backend");
            try {
              const status = await service.completeVerification({ proof });
              if (!status.verified) {
                setState("invalid_proof");
                throw new Error("Backend did not confirm World verification");
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.warn("World Selfie Check backend rejection:", error);
              setState(backendErrorState(error));
              throw error;
            }
          }}
          onSuccess={() => {
            setOpen(false);
            setState("verified");
            onVerified?.();
          }}
          onError={(code) => {
            // eslint-disable-next-line no-console
            console.warn("World Selfie Check IDKit error code:", code);
            setState(worldClientErrorState(code));
          }}
        />
      ) : null}
    </div>
  );
}
