import {
  STAGE_SELFIE_ENROLMENT_ACTION,
  asStageWorldAction,
  type StageWorldAction,
} from "./actions.js";
import type { WorldEnvironment } from "./types.js";

export function asWorldAppId(value: string): `app_${string}` {
  if (!/^app_[A-Za-z0-9_-]{3,}$/.test(value)) {
    throw new TypeError("WORLD_APP_ID must be a valid app_ identifier");
  }
  return value as `app_${string}`;
}

export function asWorldRpId(value: string): `rp_${string}` {
  if (!/^rp_[A-Za-z0-9_-]{3,}$/.test(value)) {
    throw new TypeError("WORLD_RP_ID must be a valid rp_ identifier");
  }
  return value as `rp_${string}`;
}

export function asWorldEnvironment(value: string): WorldEnvironment {
  if (value !== "production" && value !== "staging" && value !== "sandbox") {
    throw new TypeError(
      "WORLD_ENVIRONMENT must be production, staging, or sandbox",
    );
  }
  return value;
}

export function resolveWorldAction(
  value: string | undefined,
): StageWorldAction {
  return asStageWorldAction(value ?? STAGE_SELFIE_ENROLMENT_ACTION);
}
