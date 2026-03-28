"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ShopOrderListDTO } from "@/lib/order-dto";
import { formatMoney } from "@/lib/finance";
import { srDeliverOrderBatchAction } from "@/server/actions/stock";

type InvRow = { productId: string; quantity: number };

function syncAmounts(
  lines: ShopOrderListDTO["lines"],
  inv: Map<string, number>
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const l of lines) {
    const remaining = l.quantity - l.deliveredQty;
    const onHand = inv.get(l.productId) ?? 0;
    const maxNow = Math.min(remaining, onHand);
    next[l.id] = remaining > 0 && maxNow > 0 ? String(Math.min(remaining, maxNow)) : "0";
  }
  return next;
}

export function SrToDeliverOrderForm({
  order,
  inventory,
}: {
  order: ShopOrderListDTO;
  inventory: InvRow[];
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const invByProduct = useMemo(
    () => new Map(inventory.map((i) => [i.productId, i.quantity])),
    [inventory]
  );

  const rows = useMemo(
    () =>
      order.lines.map((l) => {
        const remaining = l.quantity - l.deliveredQty;
        const onHand = invByProduct.get(l.productId) ?? 0;
        const maxNow = Math.min(remaining, onHand);
        return { line: l, remaining, onHand, maxNow };
      }),
    [order.lines, invByProduct]
  );

  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    syncAmounts(order.lines, invByProduct)
  );

  // After refresh, Prisma updates deliveredQty / inventory — reset field defaults.
  const syncKey = rows.map((r) => `${r.line.id}:${r.line.deliveredQty}:${r.maxNow}`).join("|");
  useEffect(() => {
    setAmounts(syncAmounts(order.lines, invByProduct));
  }, [syncKey, order.lines, invByProduct]);

  function submit() {
    setErr(null);
    const payload: { orderLineId: string; quantity: number }[] = [];
    for (const { line, maxNow } of rows) {
      const raw = amounts[line.id] ?? "0";
      const n = raw.trim() === "" ? 0 : Number(raw);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        setErr("Use whole numbers only.");
        return;
      }
      if (n > maxNow) {
        setErr("One quantity exceeds what you can deliver now (ordered remainder × stock on you).");
        return;
      }
      if (n > 0) payload.push({ orderLineId: line.id, quantity: n });
    }
    if (!payload.length) {
      setErr("Enter at least one quantity to deliver.");
      return;
    }

    const fd = new FormData();
    fd.set("orderId", order.id);
    fd.set("lines", JSON.stringify(payload));

    start(async () => {
      const r = await srDeliverOrderBatchAction(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      <ul className="space-y-3">
        {rows.map(({ line, remaining, onHand, maxNow }) => (
          <li key={line.id} className="app-card space-y-2 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">
                  {line.brand} {line.name}
                </p>
                <p className="text-xs text-zinc-500">
                  Ordered {line.quantity} · Delivered {line.deliveredQty} · Remaining {remaining}
                </p>
                <p className="text-xs text-zinc-500">
                  On you: {onHand} · Max this drop: {maxNow}
                </p>
              </div>
              <p className="text-teal-300">{formatMoney(line.unitPrice)} each</p>
            </div>
            {remaining > 0 ? (
              <label className="block text-xs text-zinc-400">
                Deliver now
                <input
                  type="number"
                  min={0}
                  max={maxNow}
                  value={amounts[line.id] ?? "0"}
                  onChange={(e) => setAmounts((prev) => ({ ...prev, [line.id]: e.target.value }))}
                  disabled={pending || maxNow === 0}
                  className="app-input mt-1 max-w-[8rem]"
                />
              </label>
            ) : (
              <p className="text-xs text-emerald-400/90">Line complete</p>
            )}
          </li>
        ))}
      </ul>
      <button type="button" disabled={pending} onClick={submit} className="app-btn py-2.5 text-sm">
        {pending ? "Recording…" : "Confirm delivery"}
      </button>
      <p className="text-xs text-zinc-500">
        Confirmed deliveries add to the store&apos;s due right away. Stock is taken from your load.
      </p>
    </div>
  );
}
