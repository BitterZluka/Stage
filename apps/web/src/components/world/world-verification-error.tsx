import type { WorldVerificationUiState } from "@stage/world/shared";

const ERROR_MESSAGES: Partial<Record<WorldVerificationUiState, string>> = {
  cancelled: "Selfie Check was cancelled. You can try again when ready.",
  invalid_proof:
    "World could not verify this proof. Restart the check and try again.",
  duplicate:
    "This World verification is already linked or has already been used.",
  expired: "The verification request expired. Start a new Selfie Check.",
  unavailable:
    "World verification is temporarily unavailable. Please try again later.",
  configuration_error:
    "World verification is not configured correctly for this environment.",
};

export function WorldVerificationError({
  state,
}: {
  state: WorldVerificationUiState;
}) {
  const message = ERROR_MESSAGES[state];
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border-2 border-black bg-stage-pink px-4 py-3 text-sm font-semibold"
    >
      {message}
    </p>
  );
}
