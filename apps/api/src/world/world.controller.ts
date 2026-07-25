import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { WorldProviderError } from "@stage/world/server";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodType } from "zod";
import { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedWorldUser } from "./world.types.js";
import {
  createRpContextSchema,
  verifyWorldProofSchema,
} from "./world.schemas.js";
import { WorldService } from "./world.service.js";

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "creator_platform_session";

function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      error: {
        code: "VALIDATION_FAILED",
        message: "Request body is invalid",
        details: result.error.flatten(),
      },
    });
  }
  return result.data;
}

function mapWorldError(error: unknown): never {
  if (!(error instanceof WorldProviderError)) throw error;
  const body = {
    error: {
      code: error.code,
      message: error.safeMessage,
      retryable: error.retryable,
    },
  };
  if (error.code === "PROOF_REPLAYED" || error.code === "IDENTITY_CONFLICT") {
    throw new ConflictException(body);
  }
  if (
    error.code === "SELFIE_CHECK_UNAVAILABLE" ||
    error.code === "NETWORK_ERROR" ||
    error.code === "PROVIDER_ERROR" ||
    error.code === "CONFIGURATION_ERROR"
  ) {
    throw new ServiceUnavailableException(body);
  }
  throw new HttpException(body, HttpStatus.UNPROCESSABLE_ENTITY);
}

function mapWorldRequestError(error: unknown): never {
  if (
    error instanceof Error &&
    (error.message.includes("verified Hedera wallet") ||
      error.message.includes("linked to this session"))
  ) {
    throw new ConflictException({
      error: { code: "WALLET_REQUIRED", message: error.message },
    });
  }

  return mapWorldError(error);
}

@Controller("world")
export class WorldController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(WorldService)
    private readonly worldService: WorldService,
  ) {}

  private async authenticatedUser(
    request: FastifyRequest,
  ): Promise<AuthenticatedWorldUser> {
    const session = await this.authService.getSession(
      request.cookies[SESSION_COOKIE_NAME],
    );
    if (!session) {
      throw new UnauthorizedException({
        error: {
          code: "UNAUTHENTICATED",
          message: "A valid session is required",
        },
      });
    }
    return {
      id: session.user.id,
      accountIds: session.user.accountIds,
    };
  }

  @Post("rp-context")
  @HttpCode(200)
  async createRpContext(
    @Req() request: FastifyRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const input = parseBody(createRpContextSchema, body);
    reply.header("Cache-Control", "no-store");
    try {
      return await this.worldService.createRpContext(
        await this.authenticatedUser(request),
        input.hederaAccountId,
      );
    } catch (error) {
      return mapWorldRequestError(error);
    }
  }

  @Post("verify")
  @HttpCode(200)
  async verify(
    @Req() request: FastifyRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const input = parseBody(verifyWorldProofSchema, body);
    reply.header("Cache-Control", "no-store");
    try {
      return await this.worldService.verify(
        await this.authenticatedUser(request),
        input.proof,
        input.hederaAccountId,
      );
    } catch (error) {
      return mapWorldRequestError(error);
    }
  }

  @Get("status")
  async status(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    reply.header("Cache-Control", "no-store");
    return this.worldService.getStatus(await this.authenticatedUser(request));
  }
}
