import { hashSignal } from "@worldcoin/idkit-core/hashing";
import type {
  StageWorldAction,
  WorldCredentialType,
  WorldProtocolVersion,
  WorldVerificationResult,
} from "../shared/index.js";
import { worldError } from "./server-errors.js";

interface ProofResponse {
  identifier: string;
  signal_hash?: string;
  nullifier?: string;
}

interface ParsedProof {
  protocolVersion: WorldProtocolVersion;
  action: string;
  responses: ProofResponse[];
  sessionId?: string;
}

interface VerifyResponse {
  success?: boolean;
  action?: string;
  nullifier?: string;
  created_at?: string;
  session_id?: string;
  results?: Array<{
    identifier?: string;
    success?: boolean;
    nullifier?: string;
  }>;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw worldError("PROOF_INVALID", "World proof is malformed");
  }
  return value as Record<string, unknown>;
}

function credentialType(identifier: string): WorldCredentialType {
  const normalized = identifier.toLowerCase();
  if (
    normalized === "selfie" ||
    normalized === "selfie_check" ||
    normalized === "face"
  ) {
    return "selfie_check";
  }
  if (normalized === "orb" || normalized === "proof_of_human") {
    return "proof_of_human";
  }
  return "unknown";
}

function normalizeReplayKey(value: string): string {
  const trimmed = value.trim();
  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    return `0x${BigInt(trimmed).toString(16)}`;
  }
  if (/^[0-9]+$/.test(trimmed)) {
    return BigInt(trimmed).toString(10);
  }
  return trimmed;
}

export function parseAndValidateWorldProof(input: {
  proof: unknown;
  expectedAction: StageWorldAction;
  expectedSignal: string;
}): ParsedProof & {
  credentialType: WorldCredentialType;
  replayKey: string;
} {
  const proof = objectValue(input.proof);
  const version = proof.protocol_version;
  if (version !== "3.0" && version !== "4.0") {
    throw worldError("PROOF_INVALID", "World proof protocol is unsupported");
  }
  if (typeof proof.action !== "string") {
    throw worldError("PROOF_INVALID", "World proof action is missing");
  }
  if (proof.action !== input.expectedAction) {
    throw worldError(
      "ACTION_MISMATCH",
      "World proof action does not match the requested action",
    );
  }
  if (!Array.isArray(proof.responses) || proof.responses.length === 0) {
    throw worldError("PROOF_INVALID", "World proof contains no responses");
  }

  const expectedSignalHash = hashSignal(input.expectedSignal).toLowerCase();
  const responses = proof.responses.map((item) => {
    const response = objectValue(item);
    if (
      typeof response.identifier !== "string" ||
      typeof response.nullifier !== "string"
    ) {
      throw worldError("PROOF_INVALID", "World proof response is malformed");
    }
    if (
      typeof response.signal_hash !== "string" ||
      response.signal_hash.toLowerCase() !== expectedSignalHash
    ) {
      throw worldError(
        "SIGNAL_MISMATCH",
        "World proof signal does not match the authenticated Stage account",
      );
    }
    return {
      identifier: response.identifier,
      signal_hash: response.signal_hash,
      nullifier: normalizeReplayKey(response.nullifier),
    };
  });

  const supported =
    responses.find(
      (response) => credentialType(response.identifier) === "selfie_check",
    ) ?? responses[0];
  if (!supported?.nullifier) {
    throw worldError("PROOF_INVALID", "World proof has no replay identifier");
  }

  return {
    protocolVersion: version,
    action: proof.action,
    responses,
    ...(typeof proof.session_id === "string"
      ? { sessionId: proof.session_id }
      : {}),
    credentialType: supported
      ? credentialType(supported.identifier)
      : "unknown",
    replayKey: supported.nullifier,
  };
}

export function normalizeVerifiedWorldProof(input: {
  parsedProof: ReturnType<typeof parseAndValidateWorldProof>;
  verifyResponse: unknown;
  expectedAction: StageWorldAction;
  now?: Date;
}): WorldVerificationResult {
  const response = objectValue(input.verifyResponse) as VerifyResponse;
  if (response.success !== true) {
    throw worldError("PROOF_INVALID", "World proof was not verified");
  }
  if (response.action && response.action !== input.expectedAction) {
    throw worldError(
      "ACTION_MISMATCH",
      "World verifier returned an unexpected action",
    );
  }
  const successfulResult = response.results?.find(
    (result) => result.success === true,
  );
  const replayKey =
    response.nullifier ??
    successfulResult?.nullifier ??
    input.parsedProof.replayKey;
  if (!replayKey) {
    throw worldError("PROOF_INVALID", "World verifier returned no nullifier");
  }
  const verifiedAt =
    response.created_at && Number.isFinite(Date.parse(response.created_at))
      ? new Date(response.created_at).toISOString()
      : (input.now ?? new Date()).toISOString();

  return {
    success: true,
    protocolVersion: input.parsedProof.protocolVersion,
    credentialType: input.parsedProof.credentialType,
    replayKey: normalizeReplayKey(replayKey),
    ...((response.session_id ?? input.parsedProof.sessionId)
      ? { sessionId: response.session_id ?? input.parsedProof.sessionId }
      : {}),
    verifiedAt,
  };
}
