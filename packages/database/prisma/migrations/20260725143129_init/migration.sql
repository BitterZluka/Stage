-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'JUDGING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'WINNER', 'REJECTED');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING_MINT', 'MINTED', 'PENDING_REDEMPTION', 'REDEEMED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorToken" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "hederaTokenId" TEXT,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "totalSupply" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "text" TEXT,
    "artifactRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRule" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "maxWinners" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RewardRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardReservation" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardPayout" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "RewardPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "signalHash" TEXT NOT NULL,
    "nullifierHash" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorldVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perk" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "inventory" INTEGER NOT NULL,
    "claimNftTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "perkId" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING_MINT',
    "nftTokenId" TEXT,
    "nftSerial" TEXT,
    "fulfillmentData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimRedemption" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),
    "burnTxId" TEXT,

    CONSTRAINT "ClaimRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT,
    "payload" JSONB NOT NULL,
    "publicPayload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hcsSequence" TEXT,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockchainTransaction" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "hederaTransactionId" TEXT,
    "result" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockchainTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_accountId_key" ON "Wallet"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_ownerUserId_key" ON "Creator"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_handle_key" ON "Creator"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorToken_creatorId_key" ON "CreatorToken"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorToken_hederaTokenId_key" ON "CreatorToken"("hederaTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_challengeId_authorUserId_key" ON "Submission"("challengeId", "authorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRule_challengeId_key" ON "RewardRule"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardReservation_submissionId_key" ON "RewardReservation"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardReservation_challengeId_recipientId_key" ON "RewardReservation"("challengeId", "recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardPayout_reservationId_key" ON "RewardPayout"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardPayout_transactionId_key" ON "RewardPayout"("transactionId");

-- CreateIndex
CREATE INDEX "WorldVerification_userId_action_idx" ON "WorldVerification"("userId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "WorldVerification_action_nullifierHash_key" ON "WorldVerification"("action", "nullifierHash");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_perkId_claimantId_key" ON "Claim"("perkId", "claimantId");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_nftTokenId_nftSerial_key" ON "Claim"("nftTokenId", "nftSerial");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimRedemption_claimId_key" ON "ClaimRedemption"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimRedemption_burnTxId_key" ON "ClaimRedemption"("burnTxId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityId_occurredAt_idx" ON "AuditEvent"("entityId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainTransaction_idempotencyKey_key" ON "BlockchainTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainTransaction_hederaTransactionId_key" ON "BlockchainTransaction"("hederaTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorToken" ADD CONSTRAINT "CreatorToken_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRule" ADD CONSTRAINT "RewardRule_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardReservation" ADD CONSTRAINT "RewardReservation_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardReservation" ADD CONSTRAINT "RewardReservation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardReservation" ADD CONSTRAINT "RewardReservation_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardPayout" ADD CONSTRAINT "RewardPayout_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "RewardReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardPayout" ADD CONSTRAINT "RewardPayout_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldVerification" ADD CONSTRAINT "WorldVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Perk" ADD CONSTRAINT "Perk_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_perkId_fkey" FOREIGN KEY ("perkId") REFERENCES "Perk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRedemption" ADD CONSTRAINT "ClaimRedemption_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
