import type {
  StageFakeWorldProof,
  WorldFakeScenario,
  WorldRpContext,
  WorldVerificationResult,
} from "../shared/index.js";
import { worldError } from "./server-errors.js";
import type { WorldProvider } from "./world-provider.interface.js";

export interface FakeWorldProviderOptions {
  rpId?: `rp_${string}`;
  scenario?: WorldFakeScenario;
  now?: () => Date;
}

export class FakeWorldProvider implements WorldProvider {
  private readonly rpId: `rp_${string}`;
  private readonly scenario: WorldFakeScenario;
  private readonly now: () => Date;

  constructor(options: FakeWorldProviderOptions = {}) {
    this.rpId = options.rpId ?? "rp_fake_stage";
    this.scenario = options.scenario ?? "success";
    this.now = options.now ?? (() => new Date());
  }

  async createRpContext(): Promise<WorldRpContext> {
    const createdAt = Math.floor(this.now().getTime() / 1_000);
    return {
      rp_id: this.rpId,
      nonce: "fake-stage-world-nonce",
      created_at: createdAt,
      expires_at: createdAt + 300,
      signature: "fake-stage-world-signature",
    };
  }

  async verifyProof(input: {
    proof: unknown;
    expectedAction: StageFakeWorldProof["action"];
    expectedSignal: string;
  }): Promise<WorldVerificationResult> {
    const proof = input.proof as Partial<StageFakeWorldProof> | null;
    if (!proof || proof.kind !== "stage_fake_world_proof") {
      throw worldError("PROOF_INVALID", "Fake World proof is malformed");
    }
    if (proof.action !== input.expectedAction) {
      throw worldError(
        "ACTION_MISMATCH",
        "Fake World proof action does not match",
      );
    }
    if (proof.signal !== input.expectedSignal) {
      throw worldError(
        "SIGNAL_MISMATCH",
        "Fake World proof signal does not match",
      );
    }

    if (this.scenario === "invalid_proof") {
      throw worldError("PROOF_INVALID", "Fake World proof was rejected");
    }
    if (this.scenario === "duplicate") {
      throw worldError("PROOF_REPLAYED", "Fake World proof was already used");
    }
    if (this.scenario === "expired") {
      throw worldError("PROOF_EXPIRED", "Fake World proof has expired");
    }
    if (this.scenario === "unavailable") {
      throw worldError(
        "SELFIE_CHECK_UNAVAILABLE",
        "Fake World provider is unavailable",
        true,
      );
    }
    if (typeof proof.replayKey !== "string" || !proof.replayKey) {
      throw worldError("PROOF_INVALID", "Fake World proof has no replay key");
    }

    return {
      success: true,
      protocolVersion: "unknown",
      credentialType: "selfie_check",
      subjectKey: `fake-subject:${input.expectedSignal}`,
      replayKey: proof.replayKey,
      verifiedAt: this.now().toISOString(),
    };
  }
}
