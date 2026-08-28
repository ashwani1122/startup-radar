import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, SyncStatus } from "../src/generated/prisma/client";
import { HISTORICAL_FUNDING_QUERIES, syncPublicFunding } from "../src/lib/funding-ingestion";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for funding backfill.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const currentQuarter = Math.floor(now.getUTCMonth() / 3);

  for (let quarter = 0; quarter <= currentQuarter; quarter += 1) {
    const startDate = new Date(Date.UTC(year, quarter * 3, 1));
    const quarterEnd = new Date(Date.UTC(year, quarter * 3 + 3, 1));
    const endDate = quarterEnd < now ? quarterEnd : now;

    for (const search of HISTORICAL_FUNDING_QUERIES) {
      const label = `${year}-Q${quarter + 1}:${search.key}`;
      const syncProvider = `GDELT DOC 2.0:backfill:${label}`;
      const completed = await prisma.fundingSync.findFirst({ where: { provider: syncProvider, status: SyncStatus.SUCCEEDED } });
      if (completed) {
        console.info(`${label}: already completed.`);
        continue;
      }

      console.info(`${label}: checking public sources...`);
      try {
        const result = await syncPublicFunding(prisma, {
          force: true,
          startDate,
          endDate,
          syncProvider,
          query: search.query,
          maxRecords: 75,
        });
        console.info(`${label}: ${result.discovered} discovered, ${result.accepted} accepted, ${result.imported} imported.`);
      } catch (error) {
        console.error(`${label}: failed`, error instanceof Error ? error.message : error);
      }

      await new Promise((resolve) => setTimeout(resolve, 6_000));
    }
  }
}

main()
  .catch((error) => {
    console.error("Funding backfill stopped before all current-year search slices completed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
