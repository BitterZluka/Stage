import { signRequest } from "@worldcoin/idkit-server";
import type {
  StageWorldAction,
  WorldRpContext,
  WorldVerificationResult,
} from "../shared/index.js";
import type { WorldServerConfig } from "./config.js";
import {
  normalizeVerifiedWorldProof,
  parseAndValidateWorldProof,
} from "./normalize-proof.js";
import { WorldProviderError, worldError } from "./server-errors.js";
import type { WorldProvider } from "./world-provider.interface.js";

function providerFailure(status: number, body: unknown): WorldProviderError {
  const serialized =
    body && typeof body === "object" ? JSON.stringify(body) : String(body);
  const searchable = serialized.toLowerCase();
  if (
    searchable.includes("nullifier_replayed") ||
    searchable.includes("already been verified")
  ) {
    return worldError("PROOF_REPLAYED", "World proof was already used");
  }
  if (
    searchable.includes("expired") ||
    searchable.includes("timestamp_too_old")
  ) {
    return worldError("PROOF_EXPIRED", "World proof has expired");
  }
  if (searchable.includes("action")) {
    return worldError("ACTION_MISMATCH", "World proof action was rejected");
  }
  if (searchable.includes("signal")) {
    return worldError("SIGNAL_MISMATCH", "World proof signal was rejected");
  }
  if (status === 429 || status >= 500) {
    return worldError(
      "SELFIE_CHECK_UNAVAILABLE",
      "World verification is temporarily unavailable",
      true,
    );
  }
  return worldError("PROOF_INVALID", "World proof was rejected");
}

export class RealWorldProvider implements WorldProvider {
  constructor(
    private readonly config: WorldServerConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (config.provider !== "real" || !config.rpSigningKey) {
      throw worldError(
        "CONFIGURATION_ERROR",
        "RealWorldProvider requires real provider configuration",
      );
    }
  }

  async createRpContext(input: {
    action: StageWorldAction;
  }): Promise<WorldRpContext> {
    try {
      const signed = signRequest({
        signingKeyHex: this.config.rpSigningKey!,
        action: input.action,
        ttl: this.config.rpContextTtlSeconds,
      });
      return {
        rp_id: this.config.rpId,
        nonce: signed.nonce,
        created_at: signed.createdAt,
        expires_at: signed.expiresAt,
        signature: signed.sig,
      };
    } catch (cause) {
      throw worldError(
        "PROVIDER_ERROR",
        "World RP context could not be created",
        false,
        cause,
      );
    }
  }

  async verifyProof(input: {
    proof: unknown;
    expectedAction: StageWorldAction;
    expectedSignal: string;
  }): Promise<WorldVerificationResult> {
    const parsedProof = parseAndValidateWorldProof(input);
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.config.verifyBaseUrl}/api/v4/verify/${encodeURIComponent(
          this.config.rpId,
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "stage-world/0.1.0",
          },
          // World requires the IDKit response to be forwarded without remapping.
          body: JSON.stringify(input.proof),
        },
      );
    } catch (cause) {
      throw worldError(
        "NETWORK_ERROR",
        "World verification request failed",
        true,
        cause,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      throw worldError(
        "PROVIDER_ERROR",
        "World verifier returned an invalid response",
        response.status >= 500,
        cause,
      );
    }
    if (!response.ok) throw providerFailure(response.status, body);

    return normalizeVerifiedWorldProof({
      parsedProof,
      verifyResponse: body,
      expectedAction: input.expectedAction,
      now: this.now(),
    });
  }
}
