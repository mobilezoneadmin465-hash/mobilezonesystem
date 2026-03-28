import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { authOptions } from "@/lib/auth";

const nav = [
  { href: "/retail" },
  { href: "/retail/place-order" },
  { href: "/retail/deliveries" },
  { href: "/retail/orders" },
  { href: "/retail/pay" },
  { href: "/retail/account" },
];

export default async function RetailLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "RETAIL") {
    redirect("/login");
  }

  return (
    <DashboardShell
      theme="app"
      titleKey="role.retail"
      subtitle={session.user.name}
      nav={nav}
    >
      {children}
    </DashboardShell>
  );
}
