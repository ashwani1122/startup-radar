-- CreateEnum
CREATE TYPE "CompanyStage" AS ENUM ('PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'GROWTH');

-- CreateEnum
CREATE TYPE "InvestorType" AS ENUM ('ANGEL', 'ACCELERATOR', 'VENTURE_CAPITAL', 'CORPORATE', 'FAMILY_OFFICE');

-- CreateEnum
CREATE TYPE "MessageIntent" AS ENUM ('PARTNERSHIP', 'INVESTMENT', 'CUSTOMER', 'TALENT', 'PRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'DELIVERED', 'READ', 'REPLIED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Startup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "headquarters" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "foundedYear" INTEGER NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "stage" "CompanyStage" NOT NULL,
    "industry" TEXT NOT NULL,
    "tags" TEXT[],
    "logoText" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sourceConfidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Startup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Founder" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "linkedInUrl" TEXT,
    "openToMessages" BOOLEAN NOT NULL DEFAULT true,
    "responseTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Founder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingRound" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "stage" "CompanyStage" NOT NULL,
    "amountUsd" INTEGER NOT NULL,
    "amountLocal" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "announcedAt" TIMESTAMP(3) NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'Company announcement',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InvestorType" NOT NULL,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingRoundInvestor" (
    "fundingRoundId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FundingRoundInvestor_pkey" PRIMARY KEY ("fundingRoundId","investorId")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderMessage" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "founderId" TEXT,
    "senderId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "intent" "MessageIntent" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FounderMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedStartup" (
    "userId" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedStartup_pkey" PRIMARY KEY ("userId","startupId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Startup_slug_key" ON "Startup"("slug");

-- CreateIndex
CREATE INDEX "Startup_stage_employeeCount_idx" ON "Startup"("stage", "employeeCount");

-- CreateIndex
CREATE INDEX "Startup_country_industry_idx" ON "Startup"("country", "industry");

-- CreateIndex
CREATE INDEX "Founder_startupId_idx" ON "Founder"("startupId");

-- CreateIndex
CREATE INDEX "FundingRound_announcedAt_idx" ON "FundingRound"("announcedAt");

-- CreateIndex
CREATE INDEX "FundingRound_startupId_announcedAt_idx" ON "FundingRound"("startupId", "announcedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_name_key" ON "Investor"("name");

-- CreateIndex
CREATE INDEX "FundingRoundInvestor_investorId_idx" ON "FundingRoundInvestor"("investorId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_clerkUserId_key" ON "UserProfile"("clerkUserId");

-- CreateIndex
CREATE INDEX "FounderMessage_senderId_createdAt_idx" ON "FounderMessage"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "FounderMessage_startupId_createdAt_idx" ON "FounderMessage"("startupId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedStartup_createdAt_idx" ON "SavedStartup"("createdAt");

-- AddForeignKey
ALTER TABLE "Founder" ADD CONSTRAINT "Founder_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRound" ADD CONSTRAINT "FundingRound_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRoundInvestor" ADD CONSTRAINT "FundingRoundInvestor_fundingRoundId_fkey" FOREIGN KEY ("fundingRoundId") REFERENCES "FundingRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRoundInvestor" ADD CONSTRAINT "FundingRoundInvestor_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderMessage" ADD CONSTRAINT "FounderMessage_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderMessage" ADD CONSTRAINT "FounderMessage_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "Founder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderMessage" ADD CONSTRAINT "FounderMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedStartup" ADD CONSTRAINT "SavedStartup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedStartup" ADD CONSTRAINT "SavedStartup_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
