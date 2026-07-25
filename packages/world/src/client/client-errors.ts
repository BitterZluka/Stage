import type { WorldVerificationUiState } from "../shared/index.js";

const CANCELLED_CODES = new Set(["cancelled", "user_rejected"]);
const INVALID_CODES = new Set([
  "verification_rejected",
  "malformed_request",
  "unexpected_response",
  "failed_by_host_app",
  "user_presence_failed",
]);
const EXPIRED_CODES = new Set([
  "timestamp_too_old",
  "invalid_timestamp",
  "rp_signature_expired",
]);
const CONFIGURATION_CODES = new Set([
  "invalid_rp_signature",
  "unknown_rp",
  "inactive_rp",
  "invalid_rp_id_format",
]);

export function worldClientErrorState(code: string): WorldVerificationUiState {
  if (CANCELLED_CODES.has(code)) return "cancelled";
  if (code === "nullifier_replayed" || code === "max_verifications_reached") {
    return "duplicate";
  }
  if (EXPIRED_CODES.has(code)) return "expired";
  if (CONFIGURATION_CODES.has(code)) return "configuration_error";
  if (INVALID_CODES.has(code)) return "invalid_proof";
  return "unavailable";
}
