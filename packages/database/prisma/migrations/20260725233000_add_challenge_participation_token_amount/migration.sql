ALTER TABLE "Challenge"
ADD COLUMN "participationTokenAmount" TEXT NOT NULL DEFAULT '0';

ALTER TABLE "Challenge"
ADD CONSTRAINT "Challenge_participationTokenAmount_nonnegative"
CHECK ("participationTokenAmount" ~ '^(0|[1-9][0-9]*)$');

UPDATE "Challenge"
SET "requiresWorldVerification" = true;
