"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ownerReviewPaymentAction } from "@/server/actions/pay";
import { formatMoney } from "@/lib/finance";
import { useLanguage } from "@/components/LanguageContext";

type Item = {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  proofNote: string | null;
  proofImageBase64: string | null;
  createdAt: string;
  shop: { name: string };
  collectedBySR: { name: string } | null;
  submittedBy: { name: string } | null;
  receivedBy: { name: string; role: string } | null;
};

export function OwnerProofQueue({ items }: { items: Item[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [pending, start] = useTransition();

  function review(paymentId: string, decision: "CONFIRMED" | "REJECTED") {
    const fd = new FormData();
    fd.set("paymentId", paymentId);
    fd.set("decision", decision);
    start(async () => {
      await ownerReviewPaymentAction(fd);
      router.refresh();
    });
  }

  if (!items.length) {
    return <p className="text-sm text-zinc-500">{t("owner.payments.none")}</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((p) => (
        <li key={p.id} className="app-card space-y-3">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-semibold text-white">{p.shop.name}</p>
              <p className="text-lg font-semibold text-teal-300">{formatMoney(p.amount)}</p>
              <p className="text-xs text-zinc-500">
                {new Date(p.createdAt).toLocaleString()} ·{" "}
                <span className="uppercase">{p.method.replace("_", " ")}</span>
              </p>
              {p.method === "CASH_HAND_RETAIL" && p.receivedBy ? (
                <p className="text-xs text-amber-200/90">
                  {t("owner.payments.cashWith")} {p.receivedBy.name}{" "}
                  <span className="text-zinc-500">
                    (
                    {p.receivedBy.role === "OWNER" ? t("retail.pay.roleOwner") : t("retail.pay.roleField")}
                    )
                  </span>
                </p>
              ) : null}
              {p.collectedBySR ? (
                <p className="text-xs text-amber-200/90">
                  {t("owner.payments.srCollected")} {p.collectedBySR.name}
                </p>
              ) : null}
              {p.submittedBy ? (
                <p className="text-xs text-sky-200/90">
                  {t("owner.payments.fromStore")} {p.submittedBy.name}
                </p>
              ) : null}
            </div>
          </div>
          {p.note ? <p className="text-sm text-zinc-400">{p.note}</p> : null}
          {p.proofNote ? <p className="text-sm text-zinc-400">{p.proofNote}</p> : null}
          {p.proofImageBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.proofImageBase64.startsWith("data:") ? p.proofImageBase64 : `data:image/jpeg;base64,${p.proofImageBase64}`}
              alt={t("owner.payments.proofAlt")}
              className="max-h-64 w-full max-w-md rounded-lg border border-zinc-700 object-contain"
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => review(p.id, "CONFIRMED")}
              className="app-btn py-2 text-sm disabled:opacity-50"
            >
              {t("owner.payments.approve")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => review(p.id, "REJECTED")}
              className="app-btn-secondary border-red-900/50 py-2 text-sm text-red-300 disabled:opacity-50"
            >
              {t("owner.payments.reject")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
