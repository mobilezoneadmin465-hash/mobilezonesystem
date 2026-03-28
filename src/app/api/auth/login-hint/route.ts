import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLoginIdentifier } from "@/lib/user-identifiers";

/**
 * Step 1 of login: returns whether the user signs in with password (owner) or PIN (field/retail).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const raw = typeof body === "object" && body && "username" in body ? String((body as { username?: string }).username ?? "") : "";
  if (!raw.trim()) return NextResponse.json({ error: "missing" }, { status: 400 });

  const key = parseLoginIdentifier(raw);
  const user = await prisma.user.findFirst({
    where: "email" in key ? { email: key.email } : { username: key.username },
    select: { role: true, username: true, email: true },
  });

  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const authType = user.role === "OWNER" ? "password" : "pin";
  return NextResponse.json({
    authType,
    displayHint: user.username ?? user.email.split("@")[0],
  });
}
