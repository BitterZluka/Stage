import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { ZodType } from "zod";
import { requireSession } from "../auth/auth-http.js";
import { AuthService } from "../auth/auth.service.js";
import {
  createPerkSchema,
  entityIdSchema,
  listPerksSchema,
  perkTransitionSchema,
  updatePerkSchema,
} from "./perk.schemas.js";
import { PerkService, type PerkAction } from "./perk.service.js";

function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      error: {
        code: "VALIDATION_FAILED",
        message: "Request data is invalid",
        details: result.error.flatten(),
      },
    });
  }
  return result.data;
}

@Controller()
export class PerkController {
  constructor(
    @Inject(PerkService)
    private readonly perks: PerkService,
    @Inject(AuthService)
    private readonly auth: AuthService,
  ) {}

  @Get("creators/:creatorId/perks")
  list(@Param("creatorId") creatorId: string, @Query() query: unknown) {
    return this.perks.listPublic(
      parse(entityIdSchema, creatorId),
      parse(listPerksSchema, query),
    );
  }

  @Get("perks/:perkId")
  async get(@Param("perkId") perkId: string) {
    const perk = await this.perks.getPublic(parse(entityIdSchema, perkId));
    if (!perk) throw new NotFoundException();
    return perk;
  }

  @Post("creators/:creatorId/perks")
  async create(
    @Param("creatorId") creatorId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    const id = parse(entityIdSchema, creatorId);
    const input = parse(createPerkSchema, {
      ...(body as object),
      creatorId: id,
    });
    return this.perks.create(session.user.id, input);
  }

  @Patch("perks/:perkId")
  async update(
    @Param("perkId") perkId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    return this.perks.updateDraft(
      parse(entityIdSchema, perkId),
      session.user.id,
      parse(updatePerkSchema, body),
    );
  }

  @Post("perks/:perkId/activate")
  activate(
    @Param("perkId") perkId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    return this.transition(perkId, request, body, "activate");
  }

  @Post("perks/:perkId/pause")
  pause(
    @Param("perkId") perkId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    return this.transition(perkId, request, body, "pause");
  }

  @Post("perks/:perkId/resume")
  resume(
    @Param("perkId") perkId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    return this.transition(perkId, request, body, "resume");
  }

  private async transition(
    perkId: string,
    request: FastifyRequest,
    body: unknown,
    action: PerkAction,
  ) {
    const session = await requireSession(this.auth, request);
    const input = parse(perkTransitionSchema, body);
    return this.perks.transition(
      parse(entityIdSchema, perkId),
      session.user.id,
      action,
      input.expectedVersion,
    );
  }
}
