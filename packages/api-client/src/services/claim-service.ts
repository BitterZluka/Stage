import type {
  Claim,
  ClaimId,
  MutationOptions,
  OperationAccepted,
  PerkId,
} from "../contracts.js";

export interface ClaimService {
  createClaim(
    perkId: PerkId,
    options: MutationOptions,
  ): Promise<OperationAccepted>;
  getClaim(claimId: ClaimId): Promise<Claim | null>;
  requestRedemption(claimId: ClaimId, options: MutationOptions): Promise<Claim>;
}
