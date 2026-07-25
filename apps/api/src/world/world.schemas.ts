import { z } from "zod";

const accountId = z
  .string()
  .regex(/^0\.0\.\d+$/, "Invalid Hedera account ID")
  .optional();

export const createRpContextSchema = z
  .object({
    hederaAccountId: accountId,
  })
  .default({});

export const verifyWorldProofSchema = z.object({
  proof: z.unknown(),
  hederaAccountId: accountId,
});

export type CreateRpContextInput = z.infer<typeof createRpContextSchema>;
export type VerifyWorldProofInput = z.infer<typeof verifyWorldProofSchema>;
