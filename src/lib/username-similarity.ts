export type UsernameCandidate = { id: string; username: string | null; name: string };

export function normalizeUsernameForSimilarity(raw: string) {
  // Keep only alphanumeric, lowercase, and remove separators/symbols.
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function similarityScore(pendingNorm: string, approvedNorm: string) {
  if (!pendingNorm || !approvedNorm) return 0;
  if (pendingNorm === approvedNorm) return 100;
  if (approvedNorm.includes(pendingNorm) || pendingNorm.includes(approvedNorm)) return 70;

  const prefixLen = Math.min(4, pendingNorm.length, approvedNorm.length);
  if (prefixLen >= 3 && pendingNorm.slice(0, prefixLen) === approvedNorm.slice(0, prefixLen)) return 40;
  return 0;
}

export function findSimilarApprovedUsernames(
  pendingUsername: string | null,
  approved: UsernameCandidate[],
  opts: { limit?: number } = {},
) {
  if (!pendingUsername) return [];
  const pendingNorm = normalizeUsernameForSimilarity(pendingUsername);
  if (pendingNorm.length < 3) return [];

  const scored = approved
    .map((u) => {
      const approvedNorm = u.username ? normalizeUsernameForSimilarity(u.username) : "";
      const score = similarityScore(pendingNorm, approvedNorm);
      return score ? { ...u, score } : null;
    })
    .filter((x): x is UsernameCandidate & { score: number } => Boolean(x));

  scored.sort((a, b) => b.score - a.score || (a.username ?? "").localeCompare(b.username ?? ""));
  const limit = opts.limit ?? 5;
  return scored.slice(0, limit).map(({ id, username, name }) => ({ id, username, name }));
}

