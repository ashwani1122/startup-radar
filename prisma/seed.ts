import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { runFundingPipeline } from "../src/lib/funding/orchestrator";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for seeding.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const result = await runFundingPipeline(prisma, { includeBackfill: true, queueLimit: 16 });
  console.info(JSON.stringify(result, null, 2));
}

main().finally(async () => prisma.$disconnect());
