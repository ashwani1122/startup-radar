ALTER TYPE "CompanyStage" ADD VALUE IF NOT EXISTS 'UNKNOWN' BEFORE 'PRE_SEED';

CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "Startup"
  ALTER COLUMN "website" DROP NOT NULL,
  ALTER COLUMN "headquarters" DROP NOT NULL,
  ALTER COLUMN "country" DROP NOT NULL,
  ALTER COLUMN "foundedYear" DROP NOT NULL,
  ALTER COLUMN "employeeCount" DROP NOT NULL,
  ALTER COLUMN "industry" DROP NOT NULL;

ALTER TABLE "FundingRound"
  ALTER COLUMN "amountUsd" DROP NOT NULL,
  ADD COLUMN "amountDisplay" TEXT,
  ADD COLUMN "sourceDomain" TEXT,
  ADD COLUMN "sourceProvider" TEXT NOT NULL DEFAULT 'Manual',
  ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "FundingRound_externalId_key" ON "FundingRound"("externalId");

CREATE TABLE "FundingSync" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "SyncStatus" NOT NULL,
  "discovered" INTEGER NOT NULL DEFAULT 0,
  "accepted" INTEGER NOT NULL DEFAULT 0,
  "imported" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "FundingSync_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FundingSync_provider_startedAt_idx" ON "FundingSync"("provider", "startedAt");
