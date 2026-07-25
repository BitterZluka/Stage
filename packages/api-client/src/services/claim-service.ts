import type {
  Claim,
  ClaimId,
  CreateClaimInput,
  FulfillClaimInput,
  Page,
  PageRequest,
  PerkId,
} from "../contracts.js";

export interface ClaimService {
  createClaim(perkId: PerkId, input?: CreateClaimInput): Promise<Claim>;
  getClaim(claimId: ClaimId): Promise<Claim | null>;
  listClaims(page?: Partial<PageRequest>): Promise<Page<Claim>>;
  listPerkClaims(
    perkId: PerkId,
    page?: Partial<PageRequest>,
  ): Promise<Page<Claim>>;
  fulfillClaim(claimId: ClaimId, input: FulfillClaimInput): Promise<Claim>;
}
