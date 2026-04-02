"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/finance";

type ReceiptLine = {
  productId: string;
  brand: string;
  name: string;
  quantity: number;
  unitPrice: string; // decimal -> string
};

export function DeliveryReceipt({
  receiptType,
  orderId,
  deliveryId,
  confirmedAt,
  dealerName,
  deliveryAgentName,
  shop,
  lines,
  showImeisInReceipt,
  imeisByProduct,
}: {
  receiptType: "dealer" | "retailer";
  orderId: string;
  deliveryId: string;
  confirmedAt: string;
  dealerName: string;
  deliveryAgentName: string;
  shop: { name: string; ownerName?: string | null; phone: string; address?: string | null };
  lines: ReceiptLine[];
  showImeisInReceipt: boolean;
  imeisByProduct?: Record<string, string[]>;
}) {
  const [downloading, setDownloading] = useState(false);

  const totals = useMemo(() => {
    let sum = 0;
    for (const l of lines) sum += Number(l.unitPrice) * l.quantity;
    return sum;
  }, [lines]);

  const receiptTitle = receiptType === "dealer" ? "Dealer receipt" : "Retailer receipt";

  async function downloadPdf() {
    setDownloading(true);
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: "portrait" });

      doc.setFontSize(14);
      doc.text(receiptTitle, 14, 16);

      doc.setFontSize(10);
      doc.text(`Order: ${orderId}`, 14, 24);
      doc.text(`Delivery: ${deliveryId}`, 14, 30);
      doc.text(`Dealer: ${dealerName}`, 14, 36);
      doc.text(`Delivery agent: ${deliveryAgentName}`, 14, 42);
      doc.text(`Shop: ${shop.name}`, 14, 48);
      doc.text(`Confirmed: ${new Date(confirmedAt).toLocaleString()}`, 14, 54);

      const body = lines
        .filter((l) => l.quantity > 0)
        .map((l) => [
          `${l.brand} ${l.name}`,
          String(l.quantity),
          formatMoney(Number(l.unitPrice)),
          formatMoney(Number(l.unitPrice) * l.quantity),
        ]);

      const itemsTable = autoTable(doc, {
        startY: 62,
        head: [["Item", "Qty", "Unit", "Line total"]],
        body,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [20, 184, 166] },
      });

      type AutoTableResult = { finalY?: number };
      let y = (itemsTable as AutoTableResult | undefined)?.finalY ?? 82;

      if (showImeisInReceipt) {
        const imeiRows: [string, string][] = [];
        for (const l of lines) {
          const list = imeisByProduct?.[l.productId] ?? [];
          for (const imei of list) imeiRows.push([`${l.brand} ${l.name}`, imei]);
        }

        if (imeiRows.length) {
          const imeiTable = autoTable(doc, {
            startY: y + 8,
            head: [["Product", "IMEI"]],
            body: imeiRows.map((r) => [r[0], r[1]]),
            styles: { fontSize: 7 },
            headStyles: { fillColor: [16, 185, 129] },
            theme: "grid",
          });
          y = (imeiTable as AutoTableResult | undefined)?.finalY ?? y;
        }
      }

      doc.text(`Total: ${formatMoney(totals)}`, 14, y + 10);
      doc.save(`${receiptType}-delivery-${deliveryId}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  function sendWhatsApp() {
    const phone = (shop.phone ?? "").replace(/\D/g, "");
    if (!phone) {
      alert("Shop phone is missing.");
      return;
    }
    const text = `${receiptTitle}\nOrder: ${orderId}\nTotal: ${formatMoney(totals)}\nDelivery confirmed.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      <div className="app-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{receiptTitle}</h2>
            <p className="text-xs text-zinc-500">Order {orderId} · Delivery {deliveryId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Total</p>
            <p className="text-2xl font-semibold text-teal-300">{formatMoney(totals)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500">Dealer</p>
            <p className="text-sm text-white">{dealerName}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Delivery agent</p>
            <p className="text-sm text-white">{deliveryAgentName}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Shop</p>
            <p className="text-sm text-white">{shop.name}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Confirmed</p>
            <p className="text-sm text-white">{new Date(confirmedAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/95">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Item</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Qty</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Unit</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Line total</th>
              </tr>
            </thead>
            <tbody>
              {lines
                .filter((l) => l.quantity > 0)
                .map((l) => (
                  <tr key={l.productId} className="border-b border-zinc-800/70">
                    <td className="px-3 py-2 text-zinc-200">
                      {l.brand} {l.name}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-300">{l.quantity}</td>
                    <td className="px-3 py-2 text-right text-zinc-300">{formatMoney(Number(l.unitPrice))}</td>
                    <td className="px-3 py-2 text-right font-semibold text-teal-300">
                      {formatMoney(Number(l.unitPrice) * l.quantity)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {showImeisInReceipt && (imeisByProduct ? Object.values(imeisByProduct).flat().length > 0 : false) ? (
          <div className="mt-5">
            <p className="text-sm font-semibold text-white">IMEIs</p>
            <div className="mt-2 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/95">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Product
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      IMEI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines
                    .filter((l) => l.quantity > 0)
                    .flatMap((l) => (imeisByProduct?.[l.productId] ?? []).map((imei) => ({ product: l, imei })))
                    .map((row) => (
                      <tr key={`${row.product.productId}:${row.imei}`} className="border-b border-zinc-800/70">
                        <td className="px-3 py-2 text-zinc-200">
                          {row.product.brand} {row.product.name}
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-300">{row.imei}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={downloading} onClick={downloadPdf} className="app-btn py-2.5 text-sm disabled:opacity-50">
          {downloading ? "Downloading…" : "Download receipt"}
        </button>
        <button type="button" disabled={downloading} onClick={sendWhatsApp} className="app-btn-secondary py-2.5 text-sm disabled:opacity-50">
          Open WhatsApp
        </button>
      </div>
    </div>
  );
}

