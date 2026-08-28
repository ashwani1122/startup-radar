import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

const runtimeDatabaseUrl = env("DATABASE_URL");
const migrationDatabaseUrl = process.env.DIRECT_URL ?? runtimeDatabaseUrl.replace("-pooler.", ".");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationDatabaseUrl,
  },
});
