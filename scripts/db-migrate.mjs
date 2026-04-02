#!/usr/bin/env node
/**
 * Applies SQL files in /migrations (lexical order) once each.
 * Uses the same env keys as the app: DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, RAILWAY_DATABASE_URL.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function connectionString() {
  for (const key of [
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "RAILWAY_DATABASE_URL",
  ]) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

function sslOption(url) {
  if (!url) return undefined;
  const local =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes(".sock") ||
    url.includes("socket");
  return local ? undefined : { rejectUnauthorized: false };
}

const url = connectionString();
if (!url) {
  console.error(
    "db-migrate: Set DATABASE_URL (or POSTGRES_URL / POSTGRES_PRISMA_URL / RAILWAY_DATABASE_URL).",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: sslOption(url),
});

await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS public.tkn_schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

const migDir = join(repoRoot, "migrations");
const files = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.warn("db-migrate: no .sql files in migrations/");
}

for (const file of files) {
  const done = await client.query(
    "SELECT 1 AS ok FROM public.tkn_schema_migrations WHERE name = $1",
    [file],
  );
  if (done.rows.length > 0) {
    console.log(`db-migrate: skip ${file}`);
    continue;
  }

  const sql = readFileSync(join(migDir, file), "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      "INSERT INTO public.tkn_schema_migrations (name) VALUES ($1)",
      [file],
    );
    await client.query("COMMIT");
    console.log(`db-migrate: applied ${file}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`db-migrate: failed on ${file}`, err);
    process.exitCode = 1;
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("db-migrate: complete");
