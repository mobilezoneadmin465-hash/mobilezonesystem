"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { CatalogProductDTO } from "@/lib/catalog-dto";
import { orderDeliveryProgress, type ShopOrderListDTO } from "@/lib/order-dto";
import { formatMoney } from "@/lib/finance";
import {
  retailCancelOpenOrderAction,
  retailConfirmOrderAction,
  updateRetailOpenOrderAction,
} from "@/server/actions/orders";
import { useLanguage } from "@/components/LanguageContext";

function lineTotal(lines: ShopOrderListDTO["lines"]) {
  return lines.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0);
}

export function RetailOrderManageCard({
  order,
  products,
}: {
  order: ShopOrderListDTO;
  products: CatalogProductDTO[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const linesKey = useMemo(
    () => order.lines.map((l) => `${l.productId}:${l.quantity}`).join("|"),
    [order.lines]
  );

  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const l of order.lines) m[l.productId] = l.quantity;
    return m;
  });
  const [note, setNote] = useState(order.note ?? "");
  const [addProductId, setAddProductId] = useState("");

  useEffect(() => {
    const m: Record<string, number> = {};
    for (const l of order.lines) m[l.productId] = l.quantity;
    setQtyByProduct(m);
    setNote(order.note ?? "");
  }, [order.id, linesKey, order.lines, order.note, order.status, order.retailConfirmedAt]);

  const activeLines = useMemo(() => {
    return Object.entries(qtyByProduct)
      .filter(([, q]) => q > 0)
      .map(([productId, quantity]) => {
        const p = products.find((x) => x.id === productId);
        const fromOrder = order.lines.find((l) => l.productId === productId);
        const brand = p?.brand ?? fromOrder?.brand ?? "";
        const name = p?.name ?? fromOrder?.name ?? t("retail.orderCard.unknownProduct");
        const unitPrice = p?.unitPrice ?? fromOrder?.unitPrice ?? "0";
        return { productId, quantity, brand, name, unitPrice };
      });
  }, [qtyByProduct, products, order.lines, t]);

  const productsNotInCart = useMemo(() => {
    const ids = new Set(Object.keys(qtyByProduct).filter((id) => (qtyByProduct[id] ?? 0) > 0));
    return products.filter((p) => !ids.has(p.id));
  }, [products, qtyByProduct]);

  const assignedProg = useMemo(
    () => (order.status === "ASSIGNED" ? orderDeliveryProgress(order.lines) : null),
    [order.status, order.lines]
  );

  const isOpen = order.status === "OPEN";
  const confirmed = Boolean(order.retailConfirmedAt);
  const canEditLines = isOpen && !confirmed;

  function run(fd: FormData, action: (fd: FormData) => Promise<{ error?: string; success?: boolean }>) {
    setErr(null);
    start(async () => {
      const r = await action(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else router.refresh();
    });
  }

  function adjust(pid: string, delta: number) {
    setQtyByProduct((prev) => {
      const next = { ...prev };
      const cur = next[pid] ?? 0;
      const n = Math.max(0, cur + delta);
      if (n <= 0) delete next[pid];
      else next[pid] = n;
      return next;
    });
  }

  function setQty(pid: string, raw: string) {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    setQtyByProduct((prev) => {
      const next = { ...prev };
      if (n <= 0) delete next[pid];
      else next[pid] = n;
      return next;
    });
  }

  function addSelectedProduct() {
    if (!addProductId) return;
    setQtyByProduct((prev) => {
      const next = { ...prev };
      if (!next[addProductId]) next[addProductId] = 1;
      return next;
    });
    setAddProductId("");
  }

  function saveEdits() {
    const lines = activeLines.map((l) => ({ productId: l.productId, quantity: l.quantity }));
    if (!lines.length) {
      setErr(t("retail.orderCard.keepLine"));
      return;
    }
    const fd = new FormData();
    fd.set("orderId", order.id);
    fd.set("lines", JSON.stringify(lines));
    fd.set("note", note);
    run(fd, updateRetailOpenOrderAction);
  }

  return (
    <li className="app-card space-y-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-teal-500/90">
            {t(`common.orderStatus.${order.status}`)}
          </p>
          {order.retailConfirmedAt ? (
            <p className="mt-1 text-xs text-emerald-400/90">
              {t("retail.orderCard.confirmedWarehouse")} {new Date(order.retailConfirmedAt).toLocaleString()}
            </p>
          ) : isOpen ? (
            <p className="mt-1 text-xs text-amber-200/70">{t("retail.orderCard.notConfirmed")}</p>
          ) : null}
        </div>
        <p className="text-right text-lg font-semibold text-teal-300">{formatMoney(lineTotal(order.lines))}</p>
      </div>

      {order.assignedSrName ? <p className="text-xs text-sky-300">{order.assignedSrName}</p> : null}

      {canEditLines ? (
        <div className="space-y-3 border-t border-zinc-800 pt-3">
          <ul className="space-y-2">
            {activeLines.map((l) => (
              <li
                key={l.productId}
                className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white">
                    {l.brand} {l.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatMoney(l.unitPrice)} {t("retail.orderCard.each")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={t("retail.orderCard.decrease")}
                    onClick={() => adjust(l.productId, -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-600 text-lg text-white hover:bg-zinc-800"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={l.quantity}
                    onChange={(e) => setQty(l.productId, e.target.value)}
                    className="app-input w-16 py-1.5 text-center text-sm font-semibold"
                  />
                  <button
                    type="button"
                    aria-label={t("retail.orderCard.increase")}
                    onClick={() => adjust(l.productId, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-lg text-white hover:bg-teal-500"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {productsNotInCart.length > 0 ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-zinc-500">
                {t("retail.orderCard.addProduct")}
                <select
                  value={addProductId}
                  onChange={(e) => setAddProductId(e.target.value)}
                  className="app-input mt-1 min-w-[12rem]"
                >
                  <option value="">{t("retail.orderCard.choose")}</option>
                  {productsNotInCart.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" disabled={!addProductId} onClick={addSelectedProduct} className="app-btn py-2 text-xs disabled:opacity-40">
                {t("retail.orderCard.add")}
              </button>
            </div>
          ) : null}

          <label className="block text-xs text-zinc-500">
            {t("retail.cart.note")}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="app-input mt-1 resize-none" />
          </label>

          <button type="button" disabled={pending} onClick={saveEdits} className="app-btn w-full py-2 text-sm disabled:opacity-50">
            {pending ? t("retail.orderCard.saving") : t("retail.orderCard.save")}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2 border-t border-zinc-800 pt-3">
            {assignedProg ? (
              <p className="text-xs text-zinc-400">
                {t("retail.orderCard.receivedProgress")} {assignedProg.delivered} / {assignedProg.ordered}{" "}
                {t("retail.orderCard.unitsDueLine")}
              </p>
            ) : null}
            <ul className="space-y-1 text-xs text-zinc-400">
              {order.lines.map((l) => (
                <li key={l.id}>
                  {l.brand} {l.name} × {l.quantity} @ {formatMoney(l.unitPrice)}
                  {order.status === "ASSIGNED" ? (
                    <span className="text-emerald-400/90">
                      {" "}
                      ({t("retail.orderCard.deliveredShort")} {l.deliveredQty})
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          {order.note ? (
            <p className="text-xs text-zinc-500">
              {t("retail.orderCard.notePrefix")} {order.note}
            </p>
          ) : null}
        </>
      )}

      {isOpen ? (
        <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3 sm:flex-row sm:flex-wrap">
          {!confirmed ? (
            <button
              type="button"
              disabled={pending}
              className="app-btn py-2 text-sm disabled:opacity-50"
              onClick={() => {
                const lines = activeLines.map((l) => ({ productId: l.productId, quantity: l.quantity }));
                if (!lines.length) {
                  setErr(t("retail.orderCard.addBeforeConfirm"));
                  return;
                }
                const fd = new FormData();
                fd.set("orderId", order.id);
                fd.set("lines", JSON.stringify(lines));
                fd.set("note", note);
                run(fd, retailConfirmOrderAction);
              }}
            >
              {t("retail.orderCard.confirm")}
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            className="rounded-xl border border-red-900/50 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-50"
            onClick={() => {
              if (!confirm(t("retail.orderCard.cancelConfirm"))) return;
              const fd = new FormData();
              fd.set("orderId", order.id);
              run(fd, retailCancelOpenOrderAction);
            }}
          >
            {t("retail.orderCard.cancelOrder")}
          </button>
        </div>
      ) : null}

      {err ? <p className="text-sm text-red-400">{err}</p> : null}
    </li>
  );
}
