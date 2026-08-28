import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to apply the migration.");

const migrationName = "20260828110000_multisource_pipeline";
const migrationUrl = new URL(`./migrations/${migrationName}/migration.sql`, import.meta.url);

async function main() {
  const sql = await readFile(migrationUrl, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    const existing = await client.query<{ id: string }>('SELECT "id" FROM "_prisma_migrations" WHERE "migration_name" = $1 LIMIT 1', [migrationName]);
    if (existing.rowCount) {
      console.info(`${migrationName} is already recorded.`);
      return;
    }
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      'INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)',
      [randomUUID(), checksum, migrationName],
    );
    await client.query("COMMIT");
    console.info(`${migrationName} applied successfully.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Unable to apply the pending migration.", error);
  process.exitCode = 1;
});
