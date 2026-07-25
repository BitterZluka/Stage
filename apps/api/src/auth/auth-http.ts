import { UnauthorizedException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { AuthSessionView } from "./auth.types.js";
import type { AuthService } from "./auth.service.js";

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "creator_platform_session";

export async function requireSession(
  authService: AuthService,
  request: FastifyRequest,
): Promise<AuthSessionView> {
  const session = await authService.getSession(
    request.cookies[SESSION_COOKIE_NAME],
  );
  if (!session) {
    throw new UnauthorizedException({
      error: { code: "UNAUTHENTICATED", message: "Authentication is required" },
    });
  }
  return session;
}
