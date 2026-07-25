CREATE TYPE "RewardType" AS ENUM ('PARTICIPATION', 'WINNER');

ALTER TABLE "RewardRule"
ADD COLUMN "participationAmount" TEXT NOT NULL DEFAULT '0';

ALTER TABLE "RewardReservation"
ADD COLUMN "rewardType" "RewardType" NOT NULL DEFAULT 'WINNER';

ALTER TABLE "RewardReservation"
ALTER COLUMN "rewardType" DROP DEFAULT;

ALTER TABLE "RewardRule"
ADD CONSTRAINT "RewardRule_participationAmount_nonnegative"
CHECK ("participationAmount" ~ '^(0|[1-9][0-9]*)$');

ALTER TABLE "RewardRule"
ADD CONSTRAINT "RewardRule_winner_policy_consistent"
CHECK (
  (("amount" = '0') AND ("maxWinners" = 0))
  OR
  (("amount" ~ '^[1-9][0-9]*$') AND ("maxWinners" > 0))
);

DROP INDEX "RewardReservation_submissionId_key";
DROP INDEX "RewardReservation_challengeId_recipientId_key";

CREATE UNIQUE INDEX "RewardReservation_submissionId_rewardType_key"
ON "RewardReservation"("submissionId", "rewardType");

CREATE UNIQUE INDEX "RewardReservation_challengeId_recipientId_rewardType_key"
ON "RewardReservation"("challengeId", "recipientId", "rewardType");
