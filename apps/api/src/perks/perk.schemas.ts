import { z } from "zod";

const tokenAmount = z
  .string()
  .regex(/^[1-9]\d*$/, "Token threshold must be a positive integer");

export const entityIdSchema = z.uuid();

export const createPerkSchema = z.object({
  creatorId: z.uuid(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(3).max(4_000),
  tokenThreshold: tokenAmount,
  inventory: z.number().int().min(1).max(10_000),
  requiresWorldVerification: z.boolean().default(true),
});

export const updatePerkSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(3).max(4_000).optional(),
    tokenThreshold: tokenAmount.optional(),
    inventory: z.number().int().min(1).max(10_000).optional(),
    requiresWorldVerification: z.boolean().optional(),
    expectedVersion: z.number().int().positive(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "expectedVersion"),
    "At least one perk field must be provided",
  );

export const perkTransitionSchema = z.object({
  expectedVersion: z.number().int().positive(),
});

export const listPerksSchema = z.object({
  status: z.enum(["active", "paused", "exhausted"]).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePerkDto = z.infer<typeof createPerkSchema>;
export type UpdatePerkDto = z.infer<typeof updatePerkSchema>;
export type ListPerksQuery = z.infer<typeof listPerksSchema>;
