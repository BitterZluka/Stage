import { z } from "zod";

const publicHttpsUrl = z
  .url()
  .max(2_048)
  .superRefine((value, context) => {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const privateHost =
      hostname === "localhost" ||
      hostname === "::1" ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^169\.254\./.test(hostname);
    if (url.protocol !== "https:" || privateHost) {
      context.addIssue({
        code: "custom",
        message: "Evidence must use a public HTTPS URL",
      });
    }
  });

export const createSubmissionSchema = z
  .object({
    text: z.string().trim().min(1).max(4_000).optional(),
    evidenceUrl: publicHttpsUrl.optional(),
  })
  .refine((value) => value.text || value.evidenceUrl, {
    message: "Text or an evidence URL is required",
  });

export const submissionDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("accept"),
    expectedVersion: z.number().int().positive(),
  }),
  z.object({
    decision: z.literal("reject"),
    expectedVersion: z.number().int().positive(),
    reasonCode: z
      .string()
      .trim()
      .regex(/^[A-Z][A-Z0-9_]{1,39}$/),
    note: z.string().trim().max(1_000).optional(),
  }),
]);

export const listSubmissionsSchema = z.object({
  status: z.enum(["submitted", "winner", "rejected"]).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSubmissionDto = z.infer<typeof createSubmissionSchema>;
export type SubmissionDecisionDto = z.infer<typeof submissionDecisionSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsSchema>;
