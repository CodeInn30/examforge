/**
 * Vitest integration test setup.
 *
 * Requires a running PostgreSQL + PgBouncer instance.
 * Point DATABASE_URL_TEST at PgBouncer (port 6432):
 *   DATABASE_URL_TEST=postgresql://examforge_user:examforge_pass@127.0.0.1:6432/examforge_test
 *
 * The test DB is created and migrated once before all suites,
 * then fully wiped after all suites complete.
 */

import { execSync } from "child_process";
import { beforeAll, afterAll } from "vitest";
import { getPrismaTest } from "./helpers/db";

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://examforge_user:examforge_pass@127.0.0.1:6432/examforge_test";

// Expose to all test files
process.env.DATABASE_URL = TEST_DB_URL;
process.env.REDIS_URL = process.env.REDIS_URL_TEST ?? "redis://127.0.0.1:6379/1";
process.env.WHATSAPP_ENABLED = "false";
process.env.NODE_ENV = "test";

beforeAll(async () => {
  // Run migrations against test DB
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  });
  console.log("[setup] Migrations applied to test DB");
});

afterAll(async () => {
  const prisma = getPrismaTest();
  // Wipe all data (respects FK order via cascades)
  await prisma.$executeRawUnsafe(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" CASCADE';
      END LOOP;
    END $$;
  `);
  await prisma.$disconnect();
  console.log("[setup] Test DB cleaned up");
});
