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
import { challengeIdSchema } from "../challenges/challenge.schemas.js";
import {
  createSubmissionSchema,
  listSubmissionsSchema,
  submissionDecisionSchema,
} from "./submission.schemas.js";
import { SubmissionService } from "./submission.service.js";

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
export class SubmissionController {
  constructor(
    @Inject(SubmissionService)
    private readonly submissions: SubmissionService,
    @Inject(AuthService)
    private readonly auth: AuthService,
  ) {}

  @Post("challenges/:challengeId/submissions")
  async create(
    @Param("challengeId") challengeId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    return this.submissions.create(
      parse(challengeIdSchema, challengeId),
      session.user.id,
      parse(createSubmissionSchema, body),
    );
  }

  @Get("challenges/:challengeId/submissions")
  async list(
    @Param("challengeId") challengeId: string,
    @Query() query: unknown,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    return this.submissions.listForCreator(
      parse(challengeIdSchema, challengeId),
      session.user.creatorId,
      parse(listSubmissionsSchema, query),
    );
  }

  @Get("submissions/:submissionId")
  async get(
    @Param("submissionId") submissionId: string,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    const submission = await this.submissions.get(
      parse(challengeIdSchema, submissionId),
      session.user.id,
      session.user.creatorId,
    );
    if (!submission) throw new NotFoundException();
    return submission;
  }

  @Post("submissions/:submissionId/decision")
  async decide(
    @Param("submissionId") submissionId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    return this.submissions.decide(
      parse(challengeIdSchema, submissionId),
      session.user.creatorId,
      parse(submissionDecisionSchema, body),
    );
  }

  @Get("submissions/:submissionId/payout")
  async payout(
    @Param("submissionId") submissionId: string,
    @Req() request: FastifyRequest,
  ) {
    const session = await requireSession(this.auth, request);
    const payout = await this.submissions.getPayout(
      parse(challengeIdSchema, submissionId),
      session.user.id,
      session.user.creatorId,
    );
    if (!payout) throw new NotFoundException();
    return payout;
  }
}
