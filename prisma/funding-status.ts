import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for funding status.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const [startups, rounds, gdeltRounds, orphanStartups, latestSync, recentRounds] = await Promise.all([
    prisma.startup.count(),
    prisma.fundingRound.count(),
    prisma.fundingRound.count({ where: { sourceProvider: "GDELT DOC 2.0" } }),
    prisma.startup.count({ where: { rounds: { none: {} } } }),
    prisma.fundingSync.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.fundingRound.findMany({
      take: 100,
      orderBy: { announcedAt: "desc" },
      include: { startup: { select: { name: true, slug: true, industry: true } } },
    }),
  ]);
  console.info(JSON.stringify({ startups, rounds, gdeltRounds, orphanStartups, latestSync, recentRounds }, null, 2));
}

main().finally(async () => prisma.$disconnect());
