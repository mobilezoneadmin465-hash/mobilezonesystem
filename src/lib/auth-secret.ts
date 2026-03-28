/**
 * NextAuth requires a non-empty secret in production.
 * In Vercel: Project → Settings → Environment Variables → add NEXTAUTH_SECRET
 * for Production (and Preview if you test auth there). Optional alias: AUTH_SECRET.
 */
export function resolveAuthSecret(): string | undefined {
  const a = process.env.NEXTAUTH_SECRET?.trim();
  if (a) return a;
  const b = process.env.AUTH_SECRET?.trim();
  if (b) return b;
  return undefined;
}
