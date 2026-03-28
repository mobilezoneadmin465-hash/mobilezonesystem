const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/i;

/** Normalized login handle (lowercase). */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

export function isValidUsername(normalized: string): boolean {
  return USERNAME_RE.test(normalized);
}

export function internalEmailFromUsername(normalizedUsername: string): string {
  return `${normalizedUsername}@users.mobilezone.internal`;
}

export function isInternalUserEmail(email: string): boolean {
  return email.endsWith("@users.mobilezone.internal");
}

export function isPinFormat(secret: string): boolean {
  return /^\d{6}$/.test(secret);
}

export function parseLoginIdentifier(raw: string): { email: string } | { username: string } {
  const id = raw.trim().toLowerCase();
  if (id.includes("@")) return { email: id };
  return { username: normalizeUsername(id) };
}
