"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ShopOrderListDTO } from "@/lib/order-dto";
import { orderDeliveryProgress } from "@/lib/order-dto";
import { formatMoney } from "@/lib/finance";
import {
  assignOrderToSrAction,
  cancelOrderAction,
  completeOrderAction,
  unassignOrderAction,
  ownerAcceptOrderAction,
  ownerRejectOrderAction,
} from "@/server/actions/orders";
import { useLanguage } from "@/components/LanguageContext";
import { FinishPreparedDeliveryButton } from "@/components/sr/FinishPreparedDeliveryButton";

function lineTotal(lines: ShopOrderListDTO["lines"]) {
  return lines.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0);
}

export function OwnerOrderCard({
  order,
  salesReps,
  mode,
  viewerId,
}: {
  order: ShopOrderListDTO;
  salesReps: { id: string; name: string }[];
  mode: "active" | "archive";
  viewerId?: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [srId, setSrId] = useState(order.assignedSrId ?? "");
  const [pending, start] = useTransition();
  const prog = orderDeliveryProgress(order.lines);

  function run(fd: FormData, action: (fd: FormData) => Promise<{ error?: string; success?: boolean }>) {
    setErr(null);
    start(async () => {
      const r = await action(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else router.refresh();
    });
  }

  const isDone = order.status === "COMPLETED" || order.status === "CANCELLED";

  return (
    <li className="app-card space-y-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{order.shopName}</p>
          <p className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-teal-500/90">
            {t(`common.orderStatus.${order.status}`)}
          </p>
          {order.completedAt ? (
            <p className="mt-1 text-xs text-zinc-500">
              {t("owner.orderCard.completedOn")} {new Date(order.completedAt).toLocaleString()}
            </p>
          ) : null}
          {order.cancelledAt ? (
            <p className="mt-1 text-xs text-zinc-500">
              {t("owner.orderCard.cancelledOn")} {new Date(order.cancelledAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <p className="text-right text-teal-300">{formatMoney(lineTotal(order.lines))}</p>
      </div>

      {order.status === "ASSIGNED" || order.status === "OWNER_PREPARED" ? (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-sky-500/90 transition-all" style={{ width: `${prog.pct}%` }} />
          </div>
          <p className="text-xs text-zinc-400">
            {t("owner.orderCard.deliveryProgress")} {prog.delivered}/{prog.ordered} {t("owner.orderCard.unitsLines")}{" "}
            {prog.linesComplete}/{prog.lineCount} {t("owner.orderCard.linesComplete")}
          </p>
        </div>
      ) : null}

      {order.fulfilledSrName ? (
        <p className="text-xs text-emerald-400/90">
          {t("owner.orderCard.fulfilledBy")} {order.fulfilledSrName}
        </p>
      ) : null}

      <ul className="space-y-1 text-xs text-zinc-400">
        {order.lines.map((l) => (
          <li key={l.id}>
            {l.brand} {l.name} — {t("owner.orderCard.lineDelivered")} {l.deliveredQty}/{l.quantity} @{" "}
            {formatMoney(l.unitPrice)}
          </li>
        ))}
      </ul>
      {order.note ? <p className="text-xs text-zinc-500">{order.note}</p> : null}
      {order.ownerNote ? <p className="text-xs text-amber-200/80">{order.ownerNote}</p> : null}
      {order.retailConfirmedAt ? (
        <p className="text-xs text-emerald-400/90">
          {t("owner.orderCard.confirmedOn")} {new Date(order.retailConfirmedAt).toLocaleString()}
        </p>
      ) : null}
      {order.assignedSrName && mode === "active" && (order.status === "ASSIGNED" || order.status === "OWNER_PREPARED") ? (
        <p className="text-xs text-sky-300">
          {t("owner.orderCard.assigned")} {order.assignedSrName}
        </p>
      ) : null}

      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      {mode === "active" && !isDone ? (
        <div className="flex flex-col gap-3 border-t border-zinc-800 pt-3">
          {order.status === "OPEN" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                className="app-btn py-2 text-xs disabled:opacity-50"
                onClick={() => {
                  const fd = new FormData();
                  fd.set("orderId", order.id);
                  run(fd, ownerAcceptOrderAction);
                }}
              >
                {t("owner.orderCard.acceptOrder")}
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-xl border border-red-900/50 px-3 py-2 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                onClick={() => {
                  if (!confirm(t("owner.orderCard.rejectOrder"))) return;
                  const fd = new FormData();
                  fd.set("orderId", order.id);
                  run(fd, ownerRejectOrderAction);
                }}
              >
                {t("owner.orderCard.rejectOrder")}
              </button>
            </div>
          ) : null}

          {order.status === "OWNER_ACCEPTED" ? (
            <div className="flex flex-wrap gap-2 items-center">
              <Link href={`/owner/orders/${order.id}/prepare-delivery`} className="app-btn py-2 text-xs">
                {t("owner.orderCard.prepareDelivery")}
              </Link>
              <button
                type="button"
                disabled={pending}
                className="rounded-xl border border-red-900/50 px-3 py-2 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                onClick={() => {
                  if (!confirm(t("owner.orderCard.rejectOrder"))) return;
                  const fd = new FormData();
                  fd.set("orderId", order.id);
                  run(fd, ownerRejectOrderAction);
                }}
              >
                {t("owner.orderCard.rejectOrder")}
              </button>
            </div>
          ) : null}

          {order.status === "OWNER_PREPARED" ? (
            viewerId && order.assignedSrId === viewerId ? (
              <FinishPreparedDeliveryButton orderId={order.id} />
            ) : (
              <p className="text-xs text-amber-200/80">{t("owner.orderCard.waitingFinish")}</p>
            )
          ) : null}

          {order.status === "ASSIGNED" ? (
            <>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-zinc-500">
                  {t("owner.orderCard.assignLabel")}
                  <select
                    value={srId}
                    onChange={(e) => setSrId(e.target.value)}
                    className="app-input mt-1 min-w-[10rem]"
                  >
                    <option value="">—</option>
                    {salesReps.map((sr) => (
                      <option key={sr.id} value={sr.id}>
                        {sr.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={pending || !srId}
                  className="app-btn py-2 text-xs disabled:opacity-50"
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("orderId", order.id);
                    fd.set("srId", srId);
                    run(fd, assignOrderToSrAction);
                  }}
                >
                  {t("owner.orderCard.assign")}
                </button>
              </div>
              <button
                type="button"
                disabled={pending}
                className="app-btn-secondary py-1.5 text-xs"
                onClick={() => {
                  const fd = new FormData();
                  fd.set("orderId", order.id);
                  run(fd, unassignOrderAction);
                }}
              >
                {t("owner.orderCard.unassign")}
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  className="app-btn py-1.5 text-xs"
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("orderId", order.id);
                    run(fd, completeOrderAction);
                  }}
                >
                  {t("owner.orderCard.markComplete")}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-xl border border-red-900/50 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
                  onClick={() => {
                    if (!confirm(t("owner.orderCard.cancelConfirm"))) return;
                    const fd = new FormData();
                    fd.set("orderId", order.id);
                    run(fd, cancelOrderAction);
                  }}
                >
                  {t("owner.orderCard.cancelVoid")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {mode === "archive" && order.status === "COMPLETED" ? (
        <div className="border-t border-zinc-800 pt-3">
          <button
            type="button"
            disabled={pending}
            className="rounded-xl border border-amber-900/50 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-950/30"
            onClick={() => {
              if (!confirm(t("owner.orderCard.voidConfirm"))) return;
              const fd = new FormData();
              fd.set("orderId", order.id);
              run(fd, cancelOrderAction);
            }}
          >
            {t("owner.orderCard.voidOrder")}
          </button>
        </div>
      ) : null}
    </li>
  );
}
