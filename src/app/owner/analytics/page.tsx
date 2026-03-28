import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { OwnerAnalyticsView } from "@/components/owner/OwnerAnalyticsView";
import { authOptions } from "@/lib/auth";
import { computeWholesaleAnalytics, parseAnalyticsRange } from "@/lib/wholesale-analytics";
import { getT } from "@/lib/i18n/server";

export default async function OwnerAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") redirect("/login");

  const t = await getT();
  const sp = await searchParams;
  const range = parseAnalyticsRange(sp.range);
  const data = await computeWholesaleAnalytics(range);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("owner.analytics.title")}</h1>
      <OwnerAnalyticsView data={data} activeRange={range} />
    </div>
  );
}
