import { Injectable } from "@nestjs/common";

export type VerificationOutcome = "PASS" | "FAIL" | "NEEDS_REVIEW";

export interface ChallengeVerifier {
  verify(input: {
    submissionKind: "LINK" | "VIDEO" | "IMAGE" | "TEXT";
    evidenceUrl?: string;
    text?: string;
    config?: unknown;
  }): Promise<{ outcome: VerificationOutcome; reason?: string }>;
}

export const CHALLENGE_VERIFIER = Symbol("CHALLENGE_VERIFIER");

@Injectable()
export class ManualChallengeVerifier implements ChallengeVerifier {
  async verify(): Promise<{ outcome: "NEEDS_REVIEW" }> {
    return { outcome: "NEEDS_REVIEW" };
  }
}
