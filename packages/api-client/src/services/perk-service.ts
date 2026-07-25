import type {
  CreatorId,
  CreatePerkInput,
  Page,
  PageRequest,
  Perk,
  PerkId,
  UpdatePerkInput,
} from "../contracts.js";

export interface PerkService {
  listCreatorPerks(
    creatorId: CreatorId,
    page?: Partial<PageRequest>,
  ): Promise<Page<Perk>>;
  getPerk(perkId: PerkId): Promise<Perk | null>;
  createPerk(input: CreatePerkInput): Promise<Perk>;
  updatePerk(perkId: PerkId, input: UpdatePerkInput): Promise<Perk>;
  activatePerk(perkId: PerkId, expectedVersion: number): Promise<Perk>;
  pausePerk(perkId: PerkId, expectedVersion: number): Promise<Perk>;
  resumePerk(perkId: PerkId, expectedVersion: number): Promise<Perk>;
}
