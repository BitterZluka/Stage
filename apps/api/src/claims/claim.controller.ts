import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { ZodType } from "zod";
import { requireSession } from "../auth/auth-http.js";
import { AuthService } from "../auth/auth.service.js";
import { entityIdSchema } from "../perks/perk.schemas.js";
import {
  createClaimSchema,
  fulfillClaimSchema,
  listClaimsSchema,
} from "./claim.schemas.js";
import { ClaimService } from "./claim.service.js";

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
export class ClaimController {
  constructor(
    @Inject(ClaimService)
    private readonly claims: ClaimService,
    @Inject(AuthService)
    private readonly auth: AuthService,
  ) {}

  @Post("perks/:perkId/claims")
  async create(
    @Param("perkId") perkId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    return this.claims.create(
      parse(entityIdSchema, perkId),
      session.user.id,
      parse(createClaimSchema, body),
    );
  }

  @Get("claims")
  async listOwn(@Query() query: unknown, @Req() request: FastifyRequest) {
    const session = await requireSession(this.auth, request);
    return this.claims.listOwn(session.user.id, parse(listClaimsSchema, query));
  }

  @Get("perks/:perkId/claims")
  async listForCreator(
    @Param("perkId") perkId: string,
    @Query() query: unknown,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    return this.claims.listForCreator(
      parse(entityIdSchema, perkId),
      session.user.id,
      parse(listClaimsSchema, query),
    );
  }

  @Get("claims/:claimId")
  async get(@Param("claimId") claimId: string, @Req() request: FastifyRequest) {
    const session = await requireSession(this.auth, request);
    const claim = await this.claims.get(
      parse(entityIdSchema, claimId),
      session.user.id,
    );
    if (!claim) throw new NotFoundException();
    return claim;
  }

  @Post("claims/:claimId/fulfill")
  async fulfill(
    @Param("claimId") claimId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    return this.claims.fulfill(
      parse(entityIdSchema, claimId),
      session.user.id,
      parse(fulfillClaimSchema, body),
    );
  }
}
