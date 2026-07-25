import { z } from "zod";

const accountId = z
  .string()
  .regex(
    /^(?:0\.0\.\d+|0x[a-fA-F0-9]{40})$/,
    "Invalid Hedera account ID or EVM address",
  );

export const createLoginChallengeSchema = z.object({
  accountId,
});

export const createSessionSchema = z.object({
  challengeId: z.string().uuid(),
  signature: z
    .string()
    .min(32)
    .max(512)
    .regex(
      /^(?:0x[a-fA-F0-9]{130}|(?!0x)[A-Za-z0-9+/_-]+={0,2})$/,
      "Signature must be a Hedera base64 or Ethereum hex signature",
    ),
});

export const completeOnboardingSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("fan") }),
  z.object({
    intent: z.literal("creator"),
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9][a-z0-9_-]{2,29}$/,
        "Handle must be 3-30 lowercase letters, numbers, underscores, or hyphens",
      ),
    displayName: z.string().trim().min(2).max(60),
  }),
]);

export type CreateLoginChallengeInput = z.infer<
  typeof createLoginChallengeSchema
>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
