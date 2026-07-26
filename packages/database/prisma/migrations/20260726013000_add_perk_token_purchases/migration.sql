CREATE TYPE "PerkPurchaseStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'EXPIRED',
  'FAILED'
);

CREATE TABLE "PerkPurchase" (
  "id" TEXT NOT NULL,
  "perkId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "destinationAccountId" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "status" "PerkPurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "transactionReference" TEXT,
  "consensusTimestamp" TEXT,
  "claimId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PerkPurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PerkPurchase_amount_positive"
    CHECK ("amount" ~ '^[1-9][0-9]*$')
);

CREATE UNIQUE INDEX "PerkPurchase_transactionReference_key"
ON "PerkPurchase"("transactionReference");

CREATE UNIQUE INDEX "PerkPurchase_claimId_key"
ON "PerkPurchase"("claimId");

CREATE UNIQUE INDEX "PerkPurchase_perkId_buyerId_key"
ON "PerkPurchase"("perkId", "buyerId");

CREATE INDEX "PerkPurchase_perkId_status_expiresAt_idx"
ON "PerkPurchase"("perkId", "status", "expiresAt");

CREATE INDEX "PerkPurchase_buyerId_createdAt_idx"
ON "PerkPurchase"("buyerId", "createdAt");

ALTER TABLE "PerkPurchase"
ADD CONSTRAINT "PerkPurchase_perkId_fkey"
FOREIGN KEY ("perkId") REFERENCES "Perk"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PerkPurchase"
ADD CONSTRAINT "PerkPurchase_buyerId_fkey"
FOREIGN KEY ("buyerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PerkPurchase"
ADD CONSTRAINT "PerkPurchase_claimId_fkey"
FOREIGN KEY ("claimId") REFERENCES "Claim"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
