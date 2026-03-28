const productStyles: Record<string, string> = {
  IN_STOCK: "bg-slate-100 text-slate-800 ring-slate-500/10",
  ASSIGNED_TO_SR: "bg-sky-100 text-sky-900 ring-sky-500/15",
  DELIVERED_TO_SHOP: "bg-emerald-100 text-emerald-900 ring-emerald-500/15",
};

const paymentStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-950 ring-amber-500/20",
  CONFIRMED: "bg-emerald-100 text-emerald-900 ring-emerald-500/15",
  REJECTED: "bg-rose-100 text-rose-900 ring-rose-500/15",
};

export function ProductStatusBadge({ status }: { status: string }) {
  const cls = productStyles[status] ?? "bg-slate-100 text-slate-800 ring-slate-500/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const cls = paymentStyles[status] ?? "bg-slate-100 text-slate-800 ring-slate-500/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {status}
    </span>
  );
}

export function DeliveryBadge({ confirmed }: { confirmed: boolean }) {
  return confirmed ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 ring-1 ring-inset ring-emerald-500/15">
      Confirmed
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-950 ring-1 ring-inset ring-amber-500/20">
      Pending shop
    </span>
  );
}
