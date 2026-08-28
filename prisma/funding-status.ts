import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for funding status.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const [
    startups,
    rounds,
    gdeltRounds,
    orphanStartups,
    candidateStatuses,
    sourceStates,
    recentSyncs,
    recentCandidates,
    recentRounds,
  ] = await Promise.all([
    prisma.startup.count(),
    prisma.fundingRound.count(),
    prisma.fundingRound.count({ where: { sourceProvider: "GDELT DOC 2.0" } }),
    prisma.startup.count({ where: { rounds: { none: {} } } }),
    prisma.fundingCandidate.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.fundingSourceState.findMany({ orderBy: { key: "asc" } }),
    prisma.fundingSync.findMany({ take: 20, orderBy: { startedAt: "desc" } }),
    prisma.fundingCandidate.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        provider: true,
        title: true,
        status: true,
        attempts: true,
        publishedAt: true,
        lastError: true,
      },
    }),
    prisma.fundingRound.findMany({
      take: 20,
      orderBy: { announcedAt: "desc" },
      select: {
        announcedAt: true,
        amountUsd: true,
        amountDisplay: true,
        sourceProvider: true,
        sourceUrl: true,
        startup: { select: { name: true, slug: true, industry: true } },
      },
    }),
  ]);
  console.info(
    JSON.stringify(
      {
        startups,
        rounds,
        gdeltRounds,
        orphanStartups,
        candidateStatuses,
        sourceStates,
        recentSyncs,
        recentCandidates,
        recentRounds,
      },
      null,
      2,
    ),
  );
}

main().finally(async () => prisma.$disconnect());
