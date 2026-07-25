import type {
  CatalogChallenge,
  CatalogCreator,
  CatalogCreatorProfile,
  CatalogPerk,
  CatalogResponse,
} from "@creator-platform/shared";

export interface CatalogService {
  listChallenges(): Promise<CatalogResponse<CatalogChallenge>>;
  getChallenge(challengeId: string): Promise<CatalogChallenge | null>;
  listCreators(): Promise<CatalogResponse<CatalogCreator>>;
  getCreator(handle: string): Promise<CatalogCreatorProfile | null>;
  listPerks(creatorId?: string): Promise<CatalogResponse<CatalogPerk>>;
}
