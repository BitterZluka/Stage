DO $$
BEGIN
  CREATE TYPE "CreatorStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
CREATE TYPE "PerkStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXHAUSTED');

ALTER TABLE "Creator"
ADD COLUMN IF NOT EXISTS "status" "CreatorStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Perk" RENAME COLUMN "price" TO "tokenThreshold";
ALTER TABLE "Perk"
ADD COLUMN "claimedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" "PerkStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "requiresWorldVerification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Claim" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "ClaimStatus" RENAME TO "ClaimStatusLegacy";
CREATE TYPE "ClaimStatus" AS ENUM ('CLAIMED', 'FULFILLED', 'CANCELLED');
ALTER TABLE "Claim"
ALTER COLUMN "status" TYPE "ClaimStatus"
USING (
  CASE "status"::text
    WHEN 'REDEEMED' THEN 'FULFILLED'
    WHEN 'FAILED' THEN 'CANCELLED'
    ELSE 'CLAIMED'
  END
)::"ClaimStatus";
ALTER TABLE "Claim" ALTER COLUMN "status" SET DEFAULT 'CLAIMED';
DROP TYPE "ClaimStatusLegacy";

ALTER TABLE "Claim"
ADD COLUMN "eligibilitySnapshot" JSONB,
ADD COLUMN "fulfillmentNote" TEXT,
ADD COLUMN "fulfilledAt" TIMESTAMP(3),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Perk"
ADD CONSTRAINT "Perk_tokenThreshold_positive" CHECK ("tokenThreshold" ~ '^[1-9][0-9]*$'),
ADD CONSTRAINT "Perk_inventory_positive" CHECK ("inventory" > 0),
ADD CONSTRAINT "Perk_claimedCount_valid" CHECK ("claimedCount" >= 0 AND "claimedCount" <= "inventory");

CREATE INDEX "Perk_creatorId_status_createdAt_idx"
ON "Perk"("creatorId", "status", "createdAt");

CREATE INDEX "Claim_claimantId_createdAt_idx"
ON "Claim"("claimantId", "createdAt");
