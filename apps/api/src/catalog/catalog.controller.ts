import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";

@Controller("catalog")
export class CatalogController {
  constructor(
    @Inject(CatalogService)
    private readonly catalog: CatalogService,
  ) {}

  @Get("challenges")
  listChallenges() {
    return this.catalog.listChallenges();
  }

  @Get("challenges/:id")
  async getChallenge(@Param("id") id: string) {
    const challenge = await this.catalog.getChallenge(id);
    if (!challenge) throw new NotFoundException();
    return challenge;
  }

  @Get("creators")
  listCreators() {
    return this.catalog.listCreators();
  }

  @Get("creators/:handle")
  async getCreator(@Param("handle") handle: string) {
    const creator = await this.catalog.getCreator(handle);
    if (!creator) throw new NotFoundException();
    return creator;
  }

  @Get("perks")
  listPerks(@Query("creatorId") creatorId?: string) {
    return this.catalog.listPerks(creatorId || undefined);
  }
}
