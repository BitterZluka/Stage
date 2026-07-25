import { z } from "zod";

const tokenAmount = z
  .string()
  .regex(/^[1-9]\d*$/, "Reward amount must be a positive integer");
const isoTimestamp = z.iso.datetime({ offset: true });

export const challengeIdSchema = z.uuid();

export const createChallengeSchema = z
  .object({
    creatorId: z.uuid(),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(3).max(4_000),
    submissionKind: z.enum(["link", "video", "image", "text"]),
    verificationMode: z.literal("manual").default("manual"),
    startsAt: isoTimestamp,
    submissionDeadline: isoTimestamp,
    rewardAmount: tokenAmount,
    maxWinners: z.number().int().min(1).max(1_000),
    requiresWorldVerification: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (new Date(value.startsAt) >= new Date(value.submissionDeadline)) {
      context.addIssue({
        code: "custom",
        path: ["submissionDeadline"],
        message: "Submission deadline must be after the start time",
      });
    }
  });

export const updateChallengeSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(3).max(4_000).optional(),
    startsAt: isoTimestamp.optional(),
    submissionDeadline: isoTimestamp.optional(),
    rewardAmount: tokenAmount.optional(),
    maxWinners: z.number().int().min(1).max(1_000).optional(),
    requiresWorldVerification: z.boolean().optional(),
    expectedVersion: z.number().int().positive(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "expectedVersion"),
    "At least one draft field must be provided",
  );

export const listChallengesSchema = z.object({
  creatorId: z.uuid().optional(),
  status: z.enum(["published", "judging", "completed"]).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateChallengeDto = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeDto = z.infer<typeof updateChallengeSchema>;
export type ListChallengesQuery = z.infer<typeof listChallengesSchema>;
