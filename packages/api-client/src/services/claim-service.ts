import type {
  Claim,
  ClaimId,
  ConfirmPerkPurchaseInput,
  CreatePerkPurchaseInput,
  FulfillClaimInput,
  Page,
  PageRequest,
  PerkId,
  PerkPurchaseId,
  PerkPurchaseIntent,
} from "../contracts.js";

export interface ClaimService {
  createPurchaseIntent(
    perkId: PerkId,
    input?: CreatePerkPurchaseInput,
  ): Promise<PerkPurchaseIntent>;
  confirmPurchase(
    purchaseId: PerkPurchaseId,
    input: ConfirmPerkPurchaseInput,
  ): Promise<Claim>;
  getClaim(claimId: ClaimId): Promise<Claim | null>;
  listClaims(page?: Partial<PageRequest>): Promise<Page<Claim>>;
  listPerkClaims(
    perkId: PerkId,
    page?: Partial<PageRequest>,
  ): Promise<Page<Claim>>;
  fulfillClaim(claimId: ClaimId, input: FulfillClaimInput): Promise<Claim>;
}
