import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { DashboardShell } from "@/components/DashboardShell";
import { authOptions } from "@/lib/auth";
import { purgeExpiredCancelledOrders } from "@/lib/purge-cancelled-orders";

const nav = [
  { href: "/owner/dashboard" },
  { href: "/owner/catalog" },
  { href: "/owner/shops" },
  { href: "/owner/place-order" },
  { href: "/owner/orders" },
  { href: "/owner/orders/history" },
  { href: "/owner/analytics" },
  { href: "/owner/team" },
  { href: "/owner/payments" },
  { href: "/owner/summary" },
  { href: "/owner/transactions" },
  { href: "/owner/account" },
];

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  await purgeExpiredCancelledOrders();

  return (
    <DashboardShell
      theme="app"
      titleKey="role.owner"
      subtitle={session?.user?.name ?? undefined}
      nav={nav}
    >
      {children}
    </DashboardShell>
  );
}
