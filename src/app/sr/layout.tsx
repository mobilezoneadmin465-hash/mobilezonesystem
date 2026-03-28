import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { authOptions } from "@/lib/auth";

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

  return (
    <DashboardShell theme="app" titleKey="role.field" subtitle={session.user.name} nav={nav}>
      {children}
    </DashboardShell>
  );
}
