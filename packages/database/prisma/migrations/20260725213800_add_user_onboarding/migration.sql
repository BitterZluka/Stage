CREATE TYPE "UserIntent" AS ENUM ('FAN', 'CREATOR');

ALTER TABLE "User"
ADD COLUMN "primaryIntent" "UserIntent",
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

UPDATE "User" AS "user"
SET
  "primaryIntent" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "Creator"
      WHERE "Creator"."ownerUserId" = "user"."id"
    ) THEN 'CREATOR'::"UserIntent"
    ELSE 'FAN'::"UserIntent"
  END,
  "onboardingCompletedAt" = CURRENT_TIMESTAMP;
