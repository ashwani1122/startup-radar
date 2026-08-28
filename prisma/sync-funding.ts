import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { syncPublicFunding } from "../src/lib/funding-ingestion";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for funding sync.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

syncPublicFunding(prisma, { force: true })
  .then((result) => console.info(JSON.stringify(result, null, 2)))
  .finally(async () => prisma.$disconnect());
