"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ownerPrepareDeliveryAction, getUnspecifiedImeiPlaceholdersForOwnerDeliveryAction } from "@/server/actions/stock";
import { resolveUnspecifiedImeisAction } from "@/server/actions/catalog";
import { normalizeImei } from "@/lib/imei-stock";
import { formatMoney } from "@/lib/finance";

type Line = {
  orderLineId: string;
  productId: string;
  brand: string;
  name: string;
  quantity: number;
  unitPrice: string; // Decimal -> string
};

type AgentOption = { id: string; name: string };

function parseImeiList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[\s,;\r\n]+/)) {
    const imei = normalizeImei(part);
    if (!imei) continue;
    if (imei.length < 8) continue;
    if (seen.has(imei)) continue;
    seen.add(imei);
    out.push(imei);
  }
  return out;
}

export function OwnerPrepareDeliveryForm({
  orderId,
  lines,
  agents,
}: {
  orderId: string;
  lines: Line[];
  agents: AgentOption[];
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [editedLines, setEditedLines] = useState<Line[]>(lines);
  const [deliveryAgentId, setDeliveryAgentId] = useState<string>(agents[0]?.id ?? "");

  const [addImeis, setAddImeis] = useState(false);
  const [imeiPlaceholderIdsByProduct, setImeiPlaceholderIdsByProduct] = useState<Record<string, string[]>>({});
  const [imeiResolvedByProduct, setImeiResolvedByProduct] = useState<Record<string, boolean>>({});
  const [imeiModal, setImeiModal] = useState<{
    open: boolean;
    productId: string | null;
    placeholderIds: string[];
    requiredCount: number;
    error: string | null;
    imeisText: string;
  }>({ open: false, productId: null, placeholderIds: [], requiredCount: 0, error: null, imeisText: "" });

  const totals = useMemo(() => {
    let sum = 0;
    for (const l of editedLines) {
      const q = l.quantity;
      const unit = Number(l.unitPrice);
      if (!Number.isFinite(unit)) continue;
      sum += q * unit;
    }
    return sum;
  }, [editedLines]);

  function openImeiModal(productId: string) {
    const line = editedLines.find((l) => l.productId === productId);
    if (!line) return;
    const requiredCount = line.quantity;
    if (requiredCount < 1) return;

    start(async () => {
      setErr(null);
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("quantity", String(requiredCount));
      const r = await getUnspecifiedImeiPlaceholdersForOwnerDeliveryAction(fd);
      if (r && "error" in r && r.error) {
        setErr(r.error);
        return;
      }
      setImeiModal({
        open: true,
        productId,
        placeholderIds: (r as { placeholderIds: string[] }).placeholderIds,
        requiredCount,
        error: null,
        imeisText: "",
      });
      setImeiPlaceholderIdsByProduct((prev) => ({ ...prev, [productId]: (r as { placeholderIds: string[] }).placeholderIds }));
      setImeiResolvedByProduct((prev) => ({ ...prev, [productId]: false }));
    });
  }

  function closeImeiModal() {
    setImeiModal({ open: false, productId: null, placeholderIds: [], requiredCount: 0, error: null, imeisText: "" });
  }

  function submitImeiResolution() {
    if (!imeiModal.productId) return;
    const imeis = parseImeiList(imeiModal.imeisText);
    if (imeis.length !== imeiModal.requiredCount) {
      setImeiModal((prev) => ({ ...prev, error: `Enter exactly ${imeiModal.requiredCount} IMEIs.` }));
      return;
    }

    start(async () => {
      setImeiModal((prev) => ({ ...prev, error: null }));
      const fd = new FormData();
      fd.set("placeholderIds", JSON.stringify(imeiModal.placeholderIds));
      fd.set("imeis", imeis.join("\n"));
      const r = await resolveUnspecifiedImeisAction(fd);
      if (r && "error" in r && r.error) {
        setImeiModal((prev) => ({ ...prev, error: r.error }));
        return;
      }
      if (imeiModal.productId) {
        setImeiResolvedByProduct((prev) => ({ ...prev, [imeiModal.productId as string]: true }));
      }
      closeImeiModal();
    });
  }

  function updateLineQuantity(orderLineId: string, quantity: number) {
    setEditedLines((prev) =>
      prev.map((l) => (l.orderLineId === orderLineId ? { ...l, quantity: Math.max(0, Math.floor(quantity)) } : l))
    );
  }

  function updateLinePrice(orderLineId: string, unitPrice: string) {
    setEditedLines((prev) =>
      prev.map((l) => (l.orderLineId === orderLineId ? { ...l, unitPrice } : l))
    );
  }

  function submit() {
    setErr(null);
    if (!deliveryAgentId) {
      setErr("Select a delivery agent.");
      return;
    }

    const positiveLines = editedLines.filter((l) => l.quantity > 0);
    if (!positiveLines.length) {
      setErr("Enter at least one quantity greater than 0.");
      return;
    }

    if (addImeis) {
      for (const l of positiveLines) {
        const placeholderIds = imeiPlaceholderIdsByProduct[l.productId] ?? [];
        const resolved = imeiResolvedByProduct[l.productId] ?? false;
        if (placeholderIds.length !== l.quantity || !resolved) {
          setErr(`IMEIs for ${l.brand} ${l.name} are not fully resolved.`);
          return;
        }
      }
    }

    const fd = new FormData();
    fd.set("orderId", orderId);
    fd.set("deliveryAgentId", deliveryAgentId);
    fd.set("addImeis", addImeis ? "1" : "0");
    fd.set(
      "lines",
      JSON.stringify(
        editedLines.map((l) => ({
          orderLineId: l.orderLineId,
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        }))
      )
    );
    if (addImeis) {
      fd.set("imeiPlaceholderIdsByProduct", JSON.stringify(imeiPlaceholderIdsByProduct));
    }

    start(async () => {
      const r = await ownerPrepareDeliveryAction(fd);
      if (r && "error" in r && r.error) {
        setErr(r.error);
        return;
      }
      if (!r || !("deliveryId" in r) || !r.deliveryId) {
        setErr("Could not prepare delivery.");
        return;
      }
      router.push(`/owner/orders/${orderId}/prepare-delivery/success?deliveryId=${encodeURIComponent(r.deliveryId)}`);
    });
  }

  return (
    <div className="space-y-4">
      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      <div className="app-card">
        <h2 className="text-sm font-semibold text-white">Delivery lines</h2>
        <div className="mt-3 space-y-3">
          {editedLines.map((l) => (
            <div key={l.orderLineId} className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-[220px]">
                <p className="text-sm font-medium text-white">
                  {l.brand} {l.name}
                </p>
                <p className="text-xs text-zinc-500">Ordered quantity: {l.quantity}</p>
              </div>

              <div className="flex items-end gap-3">
                <label className="block text-xs text-zinc-500">
                  Qty
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={l.quantity}
                    onChange={(e) => updateLineQuantity(l.orderLineId, Number(e.target.value))}
                    disabled={pending}
                    className="app-input mt-1 w-20 text-center"
                  />
                </label>

                <label className="block text-xs text-zinc-500">
                  Unit price
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    inputMode="decimal"
                    value={l.unitPrice}
                    onChange={(e) => updateLinePrice(l.orderLineId, e.target.value)}
                    disabled={pending}
                    className="app-input mt-1 w-28 text-center"
                  />
                </label>

                <div className="text-right">
                  <p className="text-xs text-teal-300">Line total</p>
                  <p className="text-sm font-semibold text-white">
                    {formatMoney(Number(l.unitPrice) * l.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="app-card">
        <h2 className="text-sm font-semibold text-white">Delivery agent</h2>
        <label className="mt-3 block text-xs text-zinc-500">
          Assign delivery to
          <select
            value={deliveryAgentId}
            onChange={(e) => setDeliveryAgentId(e.target.value)}
            disabled={pending}
            className="app-input mt-1 w-full"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="app-card">
        <h2 className="text-sm font-semibold text-white">IMEIs (optional)</h2>
        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={addImeis}
            onChange={(e) => {
              const next = e.target.checked;
              setAddImeis(next);
              if (!next) {
                setImeiPlaceholderIdsByProduct({});
                setImeiResolvedByProduct({});
              }
            }}
            disabled={pending}
          />
          Add IMEIs to this delivery (receipt will include them)
        </label>

        {addImeis ? (
          <div className="mt-3 space-y-3">
            {editedLines
              .filter((l) => l.quantity > 0)
              .map((l) => (
                <div key={l.productId} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {l.brand} {l.name}
                    </p>
                    <p className="text-xs text-zinc-500">Need {l.quantity} IMEIs</p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    className="app-btn-secondary py-2 text-xs"
                    onClick={() => openImeiModal(l.productId)}
                  >
                    {imeiPlaceholderIdsByProduct[l.productId]?.length === l.quantity &&
                    (imeiResolvedByProduct[l.productId] ?? false)
                      ? "IMEIs ready"
                      : "Resolve IMEIs"}
                  </button>
                </div>
              ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          Total: <span className="font-semibold text-white">{formatMoney(totals)}</span>
        </p>
        <button type="button" disabled={pending} className="app-btn py-2.5 text-sm disabled:opacity-50" onClick={submit}>
          Confirm delivery
        </button>
      </div>

      {imeiModal.open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-[96px] sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={closeImeiModal} />
          <div className="relative flex w-full max-w-lg flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Resolve IMEIs</h3>
                <p className="text-xs text-zinc-500">Placeholders: {imeiModal.requiredCount}</p>
              </div>
              <button type="button" className="text-sm text-zinc-400 hover:text-white" onClick={closeImeiModal}>
                Close
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              {imeiModal.error ? <p className="text-sm text-red-400">{imeiModal.error}</p> : null}
              <label className="block text-xs text-zinc-500">
                Enter IMEIs (one per line)
                <textarea
                  value={imeiModal.imeisText}
                  onChange={(e) => setImeiModal((prev) => ({ ...prev, imeisText: e.target.value }))}
                  className="app-input mt-1 min-h-36"
                  placeholder="Type or scan IMEIs…"
                  disabled={pending}
                />
              </label>
              <button type="button" disabled={pending} className="app-btn w-full py-2.5 text-sm disabled:opacity-50" onClick={submitImeiResolution}>
                Save IMEIs
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

