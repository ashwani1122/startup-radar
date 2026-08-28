-- CreateEnum
CREATE TYPE "FundingCandidateStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'SUCCEEDED', 'REJECTED', 'DEAD');

-- CreateEnum
CREATE TYPE "FundingSourceKind" AS ENUM ('NEWS', 'SEC_FORM_D', 'RSS', 'PRESS_RELEASE', 'ACCELERATOR', 'DIRECTORY', 'COMPANY', 'VC');

-- CreateTable
CREATE TABLE "FundingCandidate" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sourceKind" "FundingSourceKind" NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "status" "FundingCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "fundingRoundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingSourceState" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "FundingSourceKind" NOT NULL,
    "cursor" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastStatus" "SyncStatus",
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "queued" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingSourceState_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "FundingCandidate_provider_externalId_key" ON "FundingCandidate"("provider", "externalId");

-- CreateIndex
CREATE INDEX "FundingCandidate_status_nextAttemptAt_idx" ON "FundingCandidate"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "FundingCandidate_provider_publishedAt_idx" ON "FundingCandidate"("provider", "publishedAt");

-- CreateIndex
CREATE INDEX "FundingCandidate_fundingRoundId_idx" ON "FundingCandidate"("fundingRoundId");

-- CreateIndex
CREATE INDEX "FundingSourceState_kind_enabled_idx" ON "FundingSourceState"("kind", "enabled");

-- CreateIndex
CREATE INDEX "FundingSourceState_lastSuccessAt_idx" ON "FundingSourceState"("lastSuccessAt");

-- AddForeignKey
ALTER TABLE "FundingCandidate" ADD CONSTRAINT "FundingCandidate_fundingRoundId_fkey" FOREIGN KEY ("fundingRoundId") REFERENCES "FundingRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;
