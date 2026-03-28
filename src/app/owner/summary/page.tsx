import { prisma } from "@/lib/prisma";
import { getPendingCashHoldingsByUser } from "@/lib/cash-holdings";
import { formatMoney } from "@/lib/finance";
import { SummaryDateForm } from "@/components/owner/SummaryDateForm";
import { getT } from "@/lib/i18n/server";

function dayBounds(dateStr: string | undefined) {
  const d = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
  if (Number.isNaN(d.getTime())) return dayBounds(undefined);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end, label: start.toLocaleDateString("en-BD", { dateStyle: "medium" }) };
}

function paymentMethodLabel(
  method: string,
  collectedName: string | null,
  receivedName: string | null,
  receivedRole: string | null,
): string {
  if (method === "ONLINE") return "Online";
  if (method === "PROOF_BANK") return "Bank / proof";
  if (method === "CASH_SR") return collectedName ? `Cash collected (SR: ${collectedName})` : "Cash (SR log)";
  if (method === "CASH_HAND_RETAIL") {
    if (receivedName) {
      const who = receivedRole === "OWNER" ? "Owner" : "Field";
      return `Cash in hand → ${receivedName} (${who})`;
    }
    return "Cash in hand";
  }
  return method;
}

export default async function OwnerSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const t = await getT();
  const sp = await searchParams;
  const { start, end, label } = dayBounds(sp.date);

  const [payments, deliveries, activities, cashHoldings, pendingToday] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "CONFIRMED",
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: "desc" },
      include: {
        shop: true,
        collectedBySR: true,
        submittedBy: true,
        receivedBy: { select: { name: true, role: true } },
      },
    }),
    prisma.shopDelivery.findMany({
      where: {
        status: "CONFIRMED",
        confirmedAt: { gte: start, lte: end },
      },
      orderBy: { confirmedAt: "desc" },
      include: { shop: true, sr: true, lines: { include: { product: true } } },
    }),
    prisma.activityEvent.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { actor: true, shop: true },
    }),
    getPendingCashHoldingsByUser(),
    prisma.payment.findMany({
      where: {
        status: "PENDING_OWNER",
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: "desc" },
      include: {
        shop: true,
        collectedBySR: true,
        submittedBy: true,
        receivedBy: { select: { name: true, role: true } },
      },
    }),
  ]);

  const payTotal = payments.reduce((s, p) => s + Number(p.amount), 0);
  const pendingTodayTotal = pendingToday.reduce((s, p) => s + Number(p.amount), 0);
  const outstandingCashTotal = cashHoldings.reduce((s, h) => s + Number(h.total), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("owner.summary.pageTitle")}</h1>
        </div>
        <SummaryDateForm initial={sp.date} />
      </div>

      <p className="text-sm text-zinc-400">{label}</p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-amber-400">Cash with team / owner (not confirmed yet)</h2>
        <p className="text-xs text-zinc-600">
          Totals below drop to zero after you approve each payment in Approve pay. Includes cash stores handed to staff
          and cash SRs logged.
        </p>
        <div className="app-card border-amber-500/25">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Outstanding held</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{formatMoney(outstandingCashTotal)}</p>
        </div>
        {cashHoldings.length === 0 ? (
          <p className="text-sm text-zinc-500">Nobody is holding unconfirmed cash right now.</p>
        ) : (
          <ul className="space-y-2">
            {cashHoldings.map((h) => (
              <li key={h.userId} className="app-card flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium text-white">{h.name}</p>
                  <p className="text-xs text-zinc-500">
                    {h.role === "OWNER" ? "Owner" : "Field team"} · {h.paymentCount} pending record
                    {h.paymentCount === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="font-semibold text-amber-300">{formatMoney(h.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="app-card border-teal-500/20">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Payments (confirmed this day)</p>
        <p className="mt-2 text-3xl font-semibold text-white">{formatMoney(payTotal)}</p>
      </div>

      {pendingToday.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400">Submitted today · awaiting your approval</h2>
          <p className="text-xs text-zinc-600">Total {formatMoney(pendingTodayTotal)} — confirm in Approve pay.</p>
          <ul className="space-y-2">
            {pendingToday.map((p) => (
              <li key={p.id} className="app-card flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium text-white">{p.shop.name}</p>
                  <p className="text-xs text-zinc-500">
                    {paymentMethodLabel(
                      p.method,
                      p.collectedBySR?.name ?? null,
                      p.receivedBy?.name ?? null,
                      p.receivedBy?.role ?? null,
                    )}
                    {" · "}
                    {p.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {p.submittedBy ? (
                    <p className="text-xs text-sky-200/80">From store: {p.submittedBy.name}</p>
                  ) : null}
                </div>
                <p className="font-semibold text-amber-300">{formatMoney(p.amount)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">Payments (confirmed)</h2>
        <ul className="space-y-2">
          {payments.map((p) => (
            <li key={p.id} className="app-card flex flex-wrap justify-between gap-2 text-sm">
              <div>
                <p className="font-medium text-white">{p.shop.name}</p>
                <p className="text-xs text-zinc-500">
                  {paymentMethodLabel(
                    p.method,
                    p.collectedBySR?.name ?? null,
                    p.receivedBy?.name ?? null,
                    p.receivedBy?.role ?? null,
                  )}
                  {" · "}
                  {p.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                {p.submittedBy ? <p className="text-xs text-sky-200/70">Recorded by {p.submittedBy.name}</p> : null}
              </div>
              <p className="font-semibold text-teal-300">{formatMoney(p.amount)}</p>
            </li>
          ))}
        </ul>
        {payments.length === 0 ? <p className="text-sm text-zinc-500">None</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">Receives</h2>
        <ul className="space-y-2">
          {deliveries.map((d) => (
            <li key={d.id} className="app-card text-sm text-zinc-300">
              <span className="text-white">{d.shop.name}</span> · {d.sr.name}
              <span className="text-zinc-500"> · {d.confirmedAt?.toLocaleString()}</span>
              <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
                {d.lines.map((l) => (
                  <li key={l.id}>
                    {l.product.brand} {l.product.name} × {l.quantity}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {deliveries.length === 0 ? <p className="text-sm text-zinc-500">No receive confirmations this day.</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">Activity</h2>
        <ul className="space-y-2">
          {activities.map((e) => (
            <li key={e.id} className="app-card text-xs text-zinc-400">
              <span className="font-medium text-white">{e.title}</span>
              {e.detail ? <span className="block text-zinc-500">{e.detail}</span> : null}
              <span className="mt-1 block text-zinc-600">
                {e.actor.name}
                {e.shop ? ` · ${e.shop.name}` : ""} · {e.createdAt.toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
