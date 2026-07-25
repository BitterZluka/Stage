import type {
  CreatorId,
  Page,
  PageRequest,
  Perk,
  PerkId,
} from "../contracts.js";

export interface PerkService {
  listCreatorPerks(
    creatorId: CreatorId,
    page?: Partial<PageRequest>,
  ): Promise<Page<Perk>>;
  getPerk(perkId: PerkId): Promise<Perk | null>;
  createPerk(
    input: Omit<Perk, "id" | "createdAt" | "updatedAt">,
  ): Promise<Perk>;
}
