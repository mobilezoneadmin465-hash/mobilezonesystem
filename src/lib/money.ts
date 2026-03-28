import { Prisma } from "@prisma/client";

/** Accepts "5000", "5,000.50", spaces; returns null if invalid or <= 0 */
export function parseBdtAmount(raw: string): Prisma.Decimal | null {
  const cleaned = raw.replace(/,/g, "").replace(/\s/g, "").trim();
  if (!cleaned) return null;
  try {
    const d = new Prisma.Decimal(cleaned);
    if (d.lte(0)) return null;
    return d;
  } catch {
    return null;
  }
}
