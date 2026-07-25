import {
  asWorldAppId,
  asWorldEnvironment,
  asWorldRpId,
  resolveWorldAction,
  type StageWorldAction,
  type WorldEnvironment,
  type WorldFakeScenario,
  type WorldProviderName,
} from "../shared/index.js";
import { worldError } from "./server-errors.js";

const FAKE_SCENARIOS = new Set<WorldFakeScenario>([
  "success",
  "invalid_proof",
  "duplicate",
  "expired",
  "unavailable",
]);

export interface WorldServerConfig {
  provider: WorldProviderName;
  environment: WorldEnvironment;
  appId: `app_${string}`;
  rpId: `rp_${string}`;
  action: StageWorldAction;
  verifyBaseUrl: string;
  rpSigningKey?: string;
  fakeScenario: WorldFakeScenario;
  rpContextTtlSeconds: number;
}

function required(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback?: string,
): string {
  const value = env[name]?.trim() || fallback;
  if (!value) {
    throw worldError(
      "CONFIGURATION_ERROR",
      `${name} is required for the configured World provider`,
    );
  }
  return value;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw worldError(
      "CONFIGURATION_ERROR",
      "WORLD_RP_CONTEXT_TTL_SECONDS must be a positive integer",
    );
  }
  return parsed;
}

export function loadWorldServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): WorldServerConfig {
  const provider = required(env, "WORLD_PROVIDER");
  if (provider !== "real" && provider !== "fake") {
    throw worldError(
      "CONFIGURATION_ERROR",
      "WORLD_PROVIDER must be real or fake",
    );
  }
  if (provider === "fake" && env.NODE_ENV === "production") {
    throw worldError(
      "CONFIGURATION_ERROR",
      "WORLD_PROVIDER=fake is prohibited when NODE_ENV=production",
    );
  }

  try {
    const environment = asWorldEnvironment(
      required(env, "WORLD_ENVIRONMENT", "staging"),
    );
    const appId = asWorldAppId(
      required(
        env,
        "WORLD_APP_ID",
        provider === "fake" ? "app_fake_stage" : undefined,
      ),
    );
    const rpId = asWorldRpId(
      required(
        env,
        "WORLD_RP_ID",
        provider === "fake" ? "rp_fake_stage" : undefined,
      ),
    );
    const action = resolveWorldAction(
      env.WORLD_ACTION_SELFIE_ENROLMENT?.trim() || undefined,
    );
    const verifyBaseUrl = new URL(
      required(env, "WORLD_VERIFY_BASE_URL", "https://developer.world.org"),
    );
    if (verifyBaseUrl.protocol !== "https:" && env.NODE_ENV === "production") {
      throw new TypeError("WORLD_VERIFY_BASE_URL must use HTTPS in production");
    }

    const signingKey = env.WORLD_RP_SIGNING_KEY?.trim();
    if (
      provider === "real" &&
      (!signingKey || !/^(?:0x)?[0-9a-fA-F]{64}$/.test(signingKey))
    ) {
      throw new TypeError(
        "WORLD_RP_SIGNING_KEY must be a 32-byte hexadecimal private key",
      );
    }
    const fakeScenario =
      (env.WORLD_FAKE_SCENARIO?.trim() as WorldFakeScenario | undefined) ??
      "success";
    if (!FAKE_SCENARIOS.has(fakeScenario)) {
      throw new TypeError("WORLD_FAKE_SCENARIO is invalid");
    }

    return {
      provider,
      environment,
      appId,
      rpId,
      action,
      verifyBaseUrl: verifyBaseUrl.toString().replace(/\/$/, ""),
      ...(signingKey ? { rpSigningKey: signingKey } : {}),
      fakeScenario,
      rpContextTtlSeconds: positiveInteger(
        env.WORLD_RP_CONTEXT_TTL_SECONDS,
        300,
      ),
    };
  } catch (cause) {
    if (cause instanceof Error && cause.name === "WorldProviderError") {
      throw cause;
    }
    throw worldError(
      "CONFIGURATION_ERROR",
      cause instanceof Error ? cause.message : "World configuration is invalid",
      false,
      cause,
    );
  }
}
