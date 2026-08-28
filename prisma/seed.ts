import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { syncPublicFunding } from "../src/lib/funding-ingestion";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for seeding.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const result = await syncPublicFunding(prisma, { force: true });
  console.info(JSON.stringify(result, null, 2));
}

main().finally(async () => prisma.$disconnect());
