import type {
  WorldProviderName,
  WorldVerificationUiState,
} from "@stage/world/shared";

const STATUS_MESSAGES: Record<WorldVerificationUiState, string> = {
  not_verified: "Selfie Check has not been completed.",
  requesting_context: "Preparing a private verification request…",
  opening_world: "Opening World…",
  waiting_for_proof: "Complete the check in World App.",
  verifying_on_backend: "Stage is verifying the proof securely…",
  verified: "Eligibility verified by the Stage backend.",
  cancelled: "Verification was cancelled.",
  invalid_proof: "The proof was not accepted.",
  duplicate: "The proof has already been used.",
  expired: "The verification request expired.",
  unavailable: "World is temporarily unavailable.",
  configuration_error: "World is not configured for this environment.",
};

export function SelfieCheckStatus({
  state,
  provider,
}: {
  state: WorldVerificationUiState;
  provider?: WorldProviderName | undefined;
}) {
  return (
    <div
      aria-live="polite"
      className="flex items-center justify-between gap-3 rounded-xl border-2 border-black bg-white px-4 py-3"
    >
      <span className="text-sm font-semibold">{STATUS_MESSAGES[state]}</span>
      {provider === "fake" ? (
        <span className="rounded-full border border-black bg-stage-yellow px-2 py-1 text-xs font-bold">
          DEMO MODE
        </span>
      ) : null}
    </div>
  );
}
