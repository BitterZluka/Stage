-- AlterTable
ALTER TABLE "Challenge"
ADD COLUMN "requiresWorldVerification" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "WorldIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "protocolVersion" TEXT NOT NULL,
    "credentialType" TEXT NOT NULL,
    "subjectKey" TEXT,
    "sessionId" TEXT,
    "signalHash" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldProofReplay" (
    "id" TEXT NOT NULL,
    "worldIdentityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "replayKey" TEXT NOT NULL,
    "protocolVersion" TEXT NOT NULL,
    "credentialType" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorldProofReplay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldRewardClaim" (
    "id" TEXT NOT NULL,
    "worldIdentityId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorldRewardClaim_pkey" PRIMARY KEY ("id")
);

-- Preserve existing replay records while moving from the Stage 0 placeholder.
INSERT INTO "WorldIdentity" (
    "id",
    "userId",
    "provider",
    "protocolVersion",
    "credentialType",
    "signalHash",
    "verifiedAt",
    "createdAt",
    "updatedAt"
)
SELECT DISTINCT ON ("userId")
    "id",
    "userId",
    'legacy',
    '3.0',
    'unknown',
    "signalHash",
    "verifiedAt",
    "verifiedAt",
    "verifiedAt"
FROM "WorldVerification"
ORDER BY "userId", "verifiedAt" ASC;

INSERT INTO "WorldProofReplay" (
    "id",
    "worldIdentityId",
    "action",
    "replayKey",
    "protocolVersion",
    "credentialType",
    "acceptedAt"
)
SELECT
    'legacy-replay-' || verification."id",
    identity."id",
    verification."action",
    verification."nullifierHash",
    '3.0',
    'unknown',
    verification."verifiedAt"
FROM "WorldVerification" AS verification
INNER JOIN "WorldIdentity" AS identity
    ON identity."userId" = verification."userId";

DROP TABLE "WorldVerification";

-- CreateIndex
CREATE UNIQUE INDEX "WorldIdentity_userId_key" ON "WorldIdentity"("userId");
CREATE UNIQUE INDEX "WorldIdentity_subjectKey_key" ON "WorldIdentity"("subjectKey");
CREATE UNIQUE INDEX "WorldIdentity_sessionId_key" ON "WorldIdentity"("sessionId");
CREATE UNIQUE INDEX "WorldProofReplay_action_replayKey_key" ON "WorldProofReplay"("action", "replayKey");
CREATE INDEX "WorldProofReplay_worldIdentityId_acceptedAt_idx" ON "WorldProofReplay"("worldIdentityId", "acceptedAt");
CREATE UNIQUE INDEX "WorldRewardClaim_challengeId_worldIdentityId_rewardType_key" ON "WorldRewardClaim"("challengeId", "worldIdentityId", "rewardType");
CREATE INDEX "WorldRewardClaim_worldIdentityId_createdAt_idx" ON "WorldRewardClaim"("worldIdentityId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorldIdentity"
ADD CONSTRAINT "WorldIdentity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorldProofReplay"
ADD CONSTRAINT "WorldProofReplay_worldIdentityId_fkey"
FOREIGN KEY ("worldIdentityId") REFERENCES "WorldIdentity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorldRewardClaim"
ADD CONSTRAINT "WorldRewardClaim_worldIdentityId_fkey"
FOREIGN KEY ("worldIdentityId") REFERENCES "WorldIdentity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorldRewardClaim"
ADD CONSTRAINT "WorldRewardClaim_challengeId_fkey"
FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
