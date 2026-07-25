CREATE TYPE "SubmissionKind" AS ENUM ('LINK', 'VIDEO', 'IMAGE', 'TEXT');
CREATE TYPE "VerificationMode" AS ENUM ('MANUAL', 'AUTOMATIC', 'HYBRID');
CREATE TYPE "CreatorStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "Creator"
ADD COLUMN "status" "CreatorStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Challenge"
ADD COLUMN "submissionKind" "SubmissionKind" NOT NULL DEFAULT 'LINK',
ADD COLUMN "verificationMode" "VerificationMode" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "verificationConfig" JSONB,
ADD COLUMN "startsAt" TIMESTAMP(3),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

UPDATE "Challenge"
SET "startsAt" = LEAST("createdAt", "submissionDeadline");

ALTER TABLE "Challenge"
ALTER COLUMN "startsAt" SET NOT NULL,
ALTER COLUMN "submissionKind" DROP DEFAULT;

ALTER TABLE "Submission"
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
