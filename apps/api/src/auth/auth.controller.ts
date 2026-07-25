import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodType } from "zod";
import {
  createLoginChallengeSchema,
  createSessionSchema,
} from "./auth.schemas.js";
import { AuthService } from "./auth.service.js";

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

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Post("challenge")
  @HttpCode(200)
  createChallenge(@Body() body: unknown) {
    return this.authService.createLoginChallenge(
      parseBody(createLoginChallengeSchema, body),
    );
  }

  @Post("session")
  @HttpCode(200)
  async createSession(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.createSession(
      parseBody(createSessionSchema, body),
    );
    reply.header("Cache-Control", "no-store");
    reply.setCookie(SESSION_COOKIE_NAME, result.token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(result.view.expiresAt),
    });
    return result.view;
  }

  @Get("me")
  async getCurrentSession(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    reply.header("Cache-Control", "no-store");
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
    return session;
  }

  @Delete("session")
  @HttpCode(204)
  async deleteSession(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.authService.revokeSession(request.cookies[SESSION_COOKIE_NAME]);
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  }
}
