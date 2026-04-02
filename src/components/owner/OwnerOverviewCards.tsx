"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { formatMoney } from "@/lib/finance";

export type WarehouseLineDTO = {
  brand: string;
  name: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
};

export type OfficeLineDTO = WarehouseLineDTO;

export type SrInventoryDetailDTO = {
  srId: string;
  srName: string;
  totalValue: string;
  lines: WarehouseLineDTO[];
};

export type PaymentDetailDTO = {
  id: string;
  shopName: string;
  amount: string;
  method: string;
  createdAt: string;
  subtitle?: string;
};

export type ShipmentDetailDTO = {
  id: string;
  shopName: string;
  srName: string;
  createdAt: string;
  lines: { brand: string; name: string; qty: number; unitPrice: string; lineTotal: string }[];
};

export type ActiveOrderDetailDTO = {
  id: string;
  shopName: string;
  status: string;
  srName: string | null;
  createdAt: string;
  total: string;
  lines: { brand: string; name: string; qty: number; unitPrice: string; lineTotal: string }[];
};

export type OverviewDetailPayload = {
  warehouse: WarehouseLineDTO[];
  office: OfficeLineDTO[];
  salesReps: SrInventoryDetailDTO[];
  paymentsToday: PaymentDetailDTO[];
  awaitingApproval: PaymentDetailDTO[];
  shipments: ShipmentDetailDTO[];
  activeOrders: ActiveOrderDetailDTO[];
};

export type OverviewTotals = {
  warehouseValue: string;
  officeValue: string;
  salesRepsValue: string;
  paymentsToday: string;
  awaitingApprovalCount: number;
  shipmentsPending: number;
  activeOrdersCount: number;
};

type ModalKey =
  | "warehouse"
  | "office"
  | "salesReps"
  | "paymentsToday"
  | "awaitingApproval"
  | "shipments"
  | "activeOrders"
  | null;

type CardKey = Exclude<ModalKey, null>;

const CARD_DEFS: {
  key: CardKey;
  labelKey: string;
  value: (tot: OverviewTotals) => string;
}[] = [
  { key: "warehouse", labelKey: "owner.dashboard.cardWarehouse", value: (tot) => tot.warehouseValue },
  { key: "office", labelKey: "owner.dashboard.cardOffice", value: (tot) => tot.officeValue },
  { key: "salesReps", labelKey: "owner.dashboard.cardReps", value: (tot) => tot.salesRepsValue },
  { key: "paymentsToday", labelKey: "owner.dashboard.cardPayToday", value: (tot) => tot.paymentsToday },
  {
    key: "awaitingApproval",
    labelKey: "owner.dashboard.cardAwaiting",
    value: (tot) => String(tot.awaitingApprovalCount),
  },
  {
    key: "shipments",
    labelKey: "owner.dashboard.cardShipments",
    value: (tot) => String(tot.shipmentsPending),
  },
  { key: "activeOrders", labelKey: "owner.dashboard.cardActiveOrders", value: (tot) => String(tot.activeOrdersCount) },
];

export function OwnerOverviewCards({
  totals,
  detail,
}: {
  totals: OverviewTotals;
  detail: OverviewDetailPayload;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState<ModalKey>(null);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_DEFS.map(({ key, labelKey, value }) => (
          <button
            key={key}
            type="button"
            onClick={() => setOpen(key)}
            className="app-card w-full cursor-pointer text-left transition hover:border-teal-500/40 hover:bg-zinc-800/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t(labelKey)}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value(totals)}</p>
          </button>
        ))}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-[96px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="overview-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label={t("owner.dashboard.close")}
            onClick={close}
          />
          <div className="relative flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h2 id="overview-modal-title" className="text-lg font-semibold text-white">
                {(() => {
                  const c = CARD_DEFS.find((x) => x.key === open);
                  return c ? t(c.labelKey) : t("owner.dashboard.details");
                })()}
              </h2>
              <button
                type="button"
                onClick={close}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                {t("owner.dashboard.close")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <ModalBody open={open} detail={detail} tr={t} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ModalBody({
  open,
  detail,
  tr,
}: {
  open: ModalKey;
  detail: OverviewDetailPayload;
  tr: (path: string) => string;
}) {
  switch (open) {
    case "warehouse":
      return <ProductLinesList items={detail.warehouse} empty={tr("owner.dashboard.emptyWarehouse")} />;
    case "office":
      return <ProductLinesList items={detail.office} empty={tr("owner.dashboard.emptyOffice")} />;
    case "salesReps":
      if (!detail.salesReps.length) {
        return <p className="text-sm text-zinc-500">{tr("owner.dashboard.noRepInv")}</p>;
      }
      return (
        <ul className="space-y-6">
          {detail.salesReps.map((sr) => (
            <li key={sr.srId} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-white">{sr.srName}</p>
                <p className="text-sm font-semibold text-teal-300">{sr.totalValue}</p>
              </div>
              {!sr.lines.length ? (
                <p className="mt-2 text-xs text-zinc-500">{tr("owner.dashboard.noUnits")}</p>
              ) : (
                <ul className="mt-3 space-y-2 border-t border-zinc-800 pt-3 text-sm">
                  {sr.lines.map((l, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-1 text-zinc-300">
                      <span>
                        {l.brand} {l.name}
                      </span>
                      <span className="text-zinc-500">
                        × {l.qty} @ {formatMoney(l.unitPrice)} →{" "}
                        <span className="text-teal-300/90">{l.lineTotal}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      );
    case "paymentsToday":
      return <PaymentList items={detail.paymentsToday} empty={tr("owner.dashboard.noPayToday")} />;
    case "awaitingApproval":
      return <PaymentList items={detail.awaitingApproval} empty={tr("owner.dashboard.nothingAwaiting")} />;
    case "shipments":
      if (!detail.shipments.length) {
        return <p className="text-sm text-zinc-500">{tr("owner.dashboard.noShipments")}</p>;
      }
      return (
        <ul className="space-y-4">
          {detail.shipments.map((d) => (
            <li key={d.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
              <p className="font-medium text-white">{d.shopName}</p>
              <p className="text-xs text-zinc-500">
                {d.srName} · {new Date(d.createdAt).toLocaleString()}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                {d.lines.map((l, i) => (
                  <li key={i}>
                    {l.brand} {l.name} × {l.qty} @ {l.lineTotal}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      );
    case "activeOrders":
      if (!detail.activeOrders.length) {
        return <p className="text-sm text-zinc-500">{tr("owner.dashboard.noActiveOrders")}</p>;
      }
      return (
        <ul className="space-y-4">
          {detail.activeOrders.map((o) => (
            <li key={o.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{o.shopName}</p>
                  <p className="text-xs uppercase text-teal-500/90">{tr(`common.orderStatus.${o.status}`)}</p>
                  <p className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleString()}</p>
                  {o.srName ? <p className="text-xs text-sky-300">{o.srName}</p> : null}
                </div>
                <p className="font-semibold text-teal-300">{o.total}</p>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                {o.lines.map((l, i) => (
                  <li key={i}>
                    {l.brand} {l.name} × {l.qty}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

function ProductLinesList({ items, empty }: { items: WarehouseLineDTO[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-zinc-500">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((l, i) => (
        <li
          key={i}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm"
        >
          <span className="text-white">
            {l.brand} {l.name}
          </span>
          <span className="text-right text-zinc-400">
            <span className="block text-xs text-zinc-500">
              {l.qty} × {formatMoney(l.unitPrice)}
            </span>
            <span className="font-semibold text-teal-300">{l.lineTotal}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function PaymentList({ items, empty }: { items: PaymentDetailDTO[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-zinc-500">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((p) => (
        <li
          key={p.id}
          className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm"
        >
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium text-white">{p.shopName}</span>
            <span className="font-semibold text-teal-300">{p.amount}</span>
          </div>
          <p className="text-xs text-zinc-500">
            {p.method.replace(/_/g, " ")} · {new Date(p.createdAt).toLocaleString()}
          </p>
          {p.subtitle ? <p className="text-xs text-zinc-400">{p.subtitle}</p> : null}
        </li>
      ))}
    </ul>
  );
}
