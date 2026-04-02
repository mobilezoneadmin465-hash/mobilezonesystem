import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const nav = [
  { href: "/sr/dashboard" },
  { href: "/sr/to-deliver" },
  { href: "/sr/warehouse" },
  { href: "/sr/office" },
  { href: "/sr/deliveries" },
];

export default async function SrLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SR") {
    redirect("/login");
  }

  // Self-registration flow: allow sign-in, but block app usage until owner approves.
  const rows = await prisma.$queryRaw<{ approvedAt: Date | null }[]>`
    SELECT "approvedAt"
    FROM "User"
    WHERE "id" = ${session.user.id}
    LIMIT 1
  `;
  if (!rows[0]?.approvedAt) {
    return (
      <div className="relative flex min-h-dvh flex-col bg-zinc-950 px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]" />
        <div className="relative z-[1] mx-auto flex w-full max-w-md flex-1 items-center justify-center">
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/95 px-6 py-10 text-center">
            <h1 className="text-xl font-bold text-white">Owner approval required</h1>
            <p className="mt-3 text-sm text-zinc-300">
              Your account is pending. You can sign in, but you must wait for the owner to approve your registration before you can operate.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell theme="app" titleKey="role.field" subtitle={session.user.name} nav={nav}>
      {children}
    </DashboardShell>
  );
}
