/**
 * Runs Prisma CLI after loading `.env` and resolving a valid PostgreSQL `DATABASE_URL`.
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function unquote(v) {
  if (v == null) return "";
  const t = String(v).trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function isPostgresUrl(v) {
  return /^postgres(ql)?:\/\//i.test(v);
}

function buildFromDiscreteVars() {
  const host = unquote(process.env.POSTGRES_HOST);
  const user = unquote(process.env.POSTGRES_USER);
  const password = unquote(process.env.POSTGRES_PASSWORD);
  const database = unquote(process.env.POSTGRES_DATABASE) || "postgres";
  const port = unquote(process.env.POSTGRES_PORT) || "5432";
  if (!host || !user || !password) return "";
  const sslOff = unquote(process.env.POSTGRES_SSL) === "0";
  const q = sslOff ? "" : "?sslmode=require";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}${q}`;
}

/** DDL and migrations should not use Supabase pooler (pgbouncer); use session/direct port when possible. */
function shouldPreferDirectUrl(cliArgs) {
  const [a, b] = cliArgs;
  if (a === "migrate") return true;
  if (a === "db" && (b === "push" || b === "pull")) return true;
  return false;
}

/**
 * First non-empty postgres URL from common Vercel / Supabase env names.
 * @param {string[]} cliArgs full prisma argv (e.g. ["migrate","deploy"])
 */
function pickPostgresUrl(cliArgs = []) {
  if (shouldPreferDirectUrl(cliArgs)) {
    for (const k of ["POSTGRES_URL_NON_POOLING", "DIRECT_URL"]) {
      const v = unquote(process.env[k]);
      if (v && isPostgresUrl(v)) return v;
    }
  }

  const keys = [
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL",
    "SUPABASE_DATABASE_URL",
  ];
  for (const k of keys) {
    const v = unquote(process.env[k]);
    if (v && isPostgresUrl(v)) return v;
  }
  const direct = unquote(process.env.DATABASE_URL);
  if (direct && isPostgresUrl(direct)) return direct;

  const built = buildFromDiscreteVars();
  if (built) return built;

  return "";
}

function ensureDatabaseUrl(prismaSubcommand, cliArgs) {
  const picked = pickPostgresUrl(cliArgs);

  if (picked) {
    process.env.DATABASE_URL = picked;
    return;
  }

  // `prisma generate` does not connect; allow build / postinstall without a real DB.
  if (prismaSubcommand === "generate") {
    process.env.DATABASE_URL =
      "postgresql://build:build@127.0.0.1:5432/build?schema=public";
    return;
  }

  const current = unquote(process.env.DATABASE_URL);
  console.error(`
[prisma-env] No valid PostgreSQL URL found.

Set at least one of (in .env or the environment):
  POSTGRES_PRISMA_URL   ← recommended (pooled; Vercel / Supabase "Prisma" string)
  POSTGRES_URL          ← pooled connection string
  DATABASE_URL          ← postgresql://... or postgres://...

Or build from parts:
  POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE (optional, default postgres)
  POSTGRES_PORT (optional, default 5432)
  POSTGRES_SSL=0        ← only if you must disable SSL (rare)

For prisma migrate / db push on Supabase, set a direct (non-pooler) URL:
  POSTGRES_URL_NON_POOLING   ← recommended
  DIRECT_URL                 ← Prisma-style alias

Remove or comment out SQLite lines like DATABASE_URL="file:./dev.db" if you use Postgres.
`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/prisma-env.cjs <prisma subcommand> [args...]");
  process.exit(1);
}

ensureDatabaseUrl(args[0], args);

const { spawnSync } = require("node:child_process");
const r = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(r.status === null ? 1 : r.status);
