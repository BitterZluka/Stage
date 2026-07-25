import { z } from "zod";

const tokenAmount = z
  .string()
  .regex(/^[1-9]\d*$/, "Reward amount must be a positive integer");
const participationTokenAmount = z
  .string()
  .regex(
    /^(0|[1-9]\d*)$/,
    "Participation token amount must be a non-negative integer",
  );
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
    participationTokenAmount: participationTokenAmount.default("0"),
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
    participationTokenAmount: participationTokenAmount.optional(),
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

export const listOwnedChallengesSchema = z.object({
  status: z
    .enum(["draft", "published", "judging", "completed", "cancelled"])
    .optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const deleteChallengeSchema = z.object({
  expectedVersion: z.number().int().positive(),
});

export type CreateChallengeDto = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeDto = z.infer<typeof updateChallengeSchema>;
export type ListChallengesQuery = z.infer<typeof listChallengesSchema>;
export type ListOwnedChallengesQuery = z.infer<
  typeof listOwnedChallengesSchema
>;
export type DeleteChallengeDto = z.infer<typeof deleteChallengeSchema>;
