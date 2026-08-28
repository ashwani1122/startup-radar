import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { runHistoricalFundingPipeline } from "../src/lib/funding/orchestrator";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for funding backfill.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

runHistoricalFundingPipeline(prisma)
  .then((result) => console.info(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error("Funding backfill failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
