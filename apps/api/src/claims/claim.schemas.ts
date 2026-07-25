import { z } from "zod";

export const createClaimSchema = z.object({
  accountId: z
    .string()
    .trim()
    .regex(/^0\.0\.\d+$/, "A canonical Hedera account ID is required")
    .optional(),
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

export type CreateClaimDto = z.infer<typeof createClaimSchema>;
export type FulfillClaimDto = z.infer<typeof fulfillClaimSchema>;
export type ListClaimsQuery = z.infer<typeof listClaimsSchema>;
