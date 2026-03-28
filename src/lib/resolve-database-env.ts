/**
 * Maps Vercel Postgres / Supabase-style env vars onto `DATABASE_URL` for Prisma Client.
 * Keep logic aligned with `scripts/prisma-env.cjs`.
 */

function unquote(v: string | undefined): string {
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

function isPostgresUrl(v: string): boolean {
  return /^postgres(ql)?:\/\//i.test(v);
}

function buildFromDiscreteVars(): string {
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

function pickPostgresUrl(): string {
  const keys = ["POSTGRES_PRISMA_URL", "POSTGRES_URL", "SUPABASE_DATABASE_URL"] as const;
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

export function resolveDatabaseUrl(): void {
  const picked = pickPostgresUrl();
  if (picked) {
    process.env.DATABASE_URL = picked;
  }
}

resolveDatabaseUrl();
