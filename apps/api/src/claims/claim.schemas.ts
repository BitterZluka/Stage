import { z } from "zod";

export const createPerkPurchaseSchema = z.object({
  accountId: z
    .string()
    .trim()
    .regex(/^0\.0\.\d+$/, "A canonical Hedera account ID is required")
    .optional(),
});

export const confirmPerkPurchaseSchema = z.object({
  transactionReference: z
    .string()
    .trim()
    .regex(
      /^(?:0x[a-fA-F0-9]{64}|0\.0\.\d+@\d+\.\d+(?:\/\d+)?)$/,
      "A Hedera transaction ID or 32-byte EVM transaction hash is required",
    ),
});

export const fulfillClaimSchema = z.object({
  expectedVersion: z.number().int().positive(),
  note: z.string().trim().min(1).max(1_000).optional(),
});

export const listClaimsSchema = z.object({
  status: z.enum(["claimed", "fulfilled", "cancelled"]).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePerkPurchaseDto = z.infer<typeof createPerkPurchaseSchema>;
export type ConfirmPerkPurchaseDto = z.infer<typeof confirmPerkPurchaseSchema>;
export type FulfillClaimDto = z.infer<typeof fulfillClaimSchema>;
export type ListClaimsQuery = z.infer<typeof listClaimsSchema>;
