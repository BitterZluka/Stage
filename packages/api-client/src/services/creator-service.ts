import type { Creator, CreatorId, Page, PageRequest } from "../contracts.js";
import type { CreateCreatorInput } from "../contracts.js";

export interface CreatorService {
  listCreators(page?: Partial<PageRequest>): Promise<Page<Creator>>;
  getCreator(creatorId: CreatorId): Promise<Creator | null>;
  createCreator(input: CreateCreatorInput): Promise<Creator>;
  updateCreator(
    creatorId: CreatorId,
    input: Partial<Pick<Creator, "displayName" | "handle">>,
  ): Promise<Creator>;
}
