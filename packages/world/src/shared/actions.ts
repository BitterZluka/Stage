export const STAGE_SELFIE_ENROLMENT_ACTION =
  "stage-selfie-enrolment-v1" as const;

export type StageWorldAction = typeof STAGE_SELFIE_ENROLMENT_ACTION;

const ALLOWED_ACTIONS = new Set<string>([STAGE_SELFIE_ENROLMENT_ACTION]);

export function isStageWorldAction(value: unknown): value is StageWorldAction {
  return typeof value === "string" && ALLOWED_ACTIONS.has(value);
}

export function asStageWorldAction(value: unknown): StageWorldAction {
  if (!isStageWorldAction(value)) {
    throw new TypeError("World action is not allowed");
  }
  return value;
}
