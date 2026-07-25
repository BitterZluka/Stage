import { z } from "zod";

const accountId = z.string().regex(/^0\.0\.\d+$/, "Invalid Hedera account ID");

export const createLoginChallengeSchema = z.object({
  accountId,
});

export const createSessionSchema = z.object({
  challengeId: z.string().uuid(),
  signature: z
    .string()
    .min(32)
    .max(512)
    .regex(/^[A-Za-z0-9+/_-]+={0,2}$/, "Signature must be base64 encoded"),
});

export type CreateLoginChallengeInput = z.infer<
  typeof createLoginChallengeSchema
>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
