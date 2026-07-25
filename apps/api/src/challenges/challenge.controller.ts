import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  challengeIdSchema,
  createChallengeSchema,
  deleteChallengeSchema,
  listChallengesSchema,
  listOwnedChallengesSchema,
  updateChallengeSchema,
} from "./challenge.schemas.js";
import { ChallengeService } from "./challenge.service.js";

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

@Controller("challenges")
export class ChallengeController {
  constructor(
    @Inject(ChallengeService)
    private readonly challenges: ChallengeService,
    @Inject(AuthService)
    private readonly auth: AuthService,
  ) {}

  @Get()
  list(@Query() query: unknown) {
    return this.challenges.listPublic(parse(listChallengesSchema, query));
  }

  @Get("mine")
  async listMine(@Query() query: unknown, @Req() request: FastifyRequest) {
    const session = await requireSession(this.auth, request);
    return this.challenges.listOwned(
      session.user.creatorId,
      parse(listOwnedChallengesSchema, query),
    );
  }

  @Get(":challengeId")
  async get(@Param("challengeId") challengeId: string) {
    const challenge = await this.challenges.getPublic(
      parse(challengeIdSchema, challengeId),
    );
    if (!challenge) throw new NotFoundException();
    return challenge;
  }

  @Post()
  async create(@Body() body: unknown, @Req() request: FastifyRequest) {
    const session = await requireSession(this.auth, request);
    return this.challenges.create(
      session.user.creatorId,
      parse(createChallengeSchema, body),
    );
  }

  @Patch(":challengeId")
  async update(
    @Param("challengeId") challengeId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    return this.challenges.updateDraft(
      parse(challengeIdSchema, challengeId),
      session.user.creatorId,
      parse(updateChallengeSchema, body),
    );
  }

  @Delete(":challengeId")
  @HttpCode(204)
  async delete(
    @Param("challengeId") challengeId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    const session = await requireSession(this.auth, request);
    const input = parse(deleteChallengeSchema, body);
    await this.challenges.deleteDraft(
      parse(challengeIdSchema, challengeId),
      session.user.creatorId,
      input.expectedVersion,
    );
  }

  @Post(":challengeId/publish")
  async publish(
    @Param("challengeId") challengeId: string,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    return this.challenges.publish(
      parse(challengeIdSchema, challengeId),
      session.user.creatorId,
    );
  }

  @Post(":challengeId/close")
  close(
    @Param("challengeId") challengeId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.withTransition(challengeId, request, "close");
  }

  @Post(":challengeId/complete")
  complete(
    @Param("challengeId") challengeId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.withTransition(challengeId, request, "complete");
  }

  @Post(":challengeId/cancel")
  cancel(
    @Param("challengeId") challengeId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.withTransition(challengeId, request, "cancel");
  }

  private async withTransition(
    challengeId: string,
    request: FastifyRequest,
    action: "close" | "complete" | "cancel",
  ) {
    const session = await requireSession(this.auth, request);
    return this.challenges.transition(
      parse(challengeIdSchema, challengeId),
      session.user.creatorId,
      action,
    );
  }
}
