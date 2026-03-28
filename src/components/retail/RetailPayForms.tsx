"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { retailPayCashHandAction, retailPayOnlineAction, retailPayProofAction } from "@/server/actions/pay";
import { formatMoney } from "@/lib/finance";
import { useLanguage } from "@/components/LanguageContext";

type CashPayee = { id: string; name: string; role: "OWNER" | "SR" };

export function RetailPayForms({
  dueAmount,
  cashPayees,
  defaultCashRecipientId,
}: {
  dueAmount: string;
  cashPayees: CashPayee[];
  defaultCashRecipientId: string | null;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<"online" | "proof" | "cash">("online");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const dueNum = Number(dueAmount || "0");
  const canCashHand = dueNum > 0 && cashPayees.length > 0;

  function readFile(): Promise<string | null> {
    return new Promise((resolve) => {
      const f = fileRef.current?.files?.[0];
      if (!f) {
        resolve(null);
        return;
      }
      if (f.size > 350_000) {
        resolve("__too_large__");
        return;
      }
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(f);
    });
  }

  function onOnline(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setErr(null);
    setMsg(null);
    const fd = new FormData(form);
    start(async () => {
      const r = await retailPayOnlineAction(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else {
        setMsg(t("retail.pay.msgOnlinePending"));
        form.reset();
        router.refresh();
      }
    });
  }

  async function onProof(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setErr(null);
    setMsg(null);
    const image = await readFile();
    if (image === "__too_large__") {
      setErr(t("retail.pay.errPhotoLarge"));
      return;
    }
    if (!image) {
      setErr(t("retail.pay.errAttachPhoto"));
      return;
    }
    const fd = new FormData(form);
    fd.set("proofImageBase64", image);
    start(async () => {
      const r = await retailPayProofAction(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else {
        setMsg(t("retail.pay.msgSubmitted"));
        form.reset();
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    });
  }

  function onCashHand(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setErr(null);
    setMsg(null);
    const fd = new FormData(form);
    start(async () => {
      const r = await retailPayCashHandAction(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else {
        setMsg(t("retail.pay.msgCashRecorded"));
        const pinEl = form.querySelector<HTMLInputElement>('input[name="amount"]');
        if (pinEl) pinEl.value = "";
        router.refresh();
      }
    });
  }

  const tabBtn = (id: "online" | "proof" | "cash", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-full px-4 py-2 text-sm font-medium ${
        tab === id ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="app-card">
        <p className="text-xs text-zinc-500">{t("retail.pay.due")}</p>
        <p className="mt-1 text-2xl font-semibold text-teal-300">{formatMoney(dueAmount || "0")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabBtn("online", t("retail.pay.tabOnline"))}
        {tabBtn("proof", t("retail.pay.tabProof"))}
        {tabBtn("cash", t("retail.pay.tabCash"))}
      </div>

      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {msg ? <p className="text-sm text-teal-300">{msg}</p> : null}

      {tab === "online" ? (
        <form onSubmit={onOnline} className="app-card space-y-4">
          <label className="text-xs text-zinc-500">
            {t("retail.pay.amountBdt")}
            <input name="amount" type="text" required className="app-input mt-1" placeholder="5000" />
          </label>
          <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
            {pending ? t("retail.pay.saving") : t("retail.pay.recordPayment")}
          </button>
        </form>
      ) : null}

      {tab === "proof" ? (
        <form onSubmit={onProof} className="app-card space-y-4">
          <label className="text-xs text-zinc-500">
            {t("retail.pay.amountBdt")}
            <input name="amount" type="text" required className="app-input mt-1" />
          </label>
          <label className="text-xs text-zinc-500">
            {t("retail.pay.proofNote")}
            <input
              name="proofNote"
              className="app-input mt-1"
              placeholder={t("retail.pay.proofNotePlaceholder")}
            />
          </label>
          <label className="text-xs text-zinc-500">
            {t("retail.pay.screenshot")}
            <input ref={fileRef} type="file" accept="image/*" className="mt-2 block w-full text-sm text-zinc-400" />
          </label>
          <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
            {pending ? t("retail.pay.sending") : t("retail.pay.submitProof")}
          </button>
        </form>
      ) : null}

      {tab === "cash" ? (
        <div className="app-card space-y-4">
          {!canCashHand ? (
            <p className="text-sm text-zinc-500">
              {dueNum <= 0 ? t("retail.pay.cashNoDue") : t("retail.pay.cashNoPayees")}
            </p>
          ) : (
            <form onSubmit={onCashHand} className="space-y-4">
              <label className="text-xs text-zinc-500">
                {t("retail.pay.amountBdt")}
                <input name="amount" type="text" required className="app-input mt-1" placeholder="Up to your due" />
              </label>
              <label className="text-xs text-zinc-500">
                {t("retail.pay.handedTo")}
                <select
                  name="receivedByUserId"
                  required
                  className="app-input mt-1"
                  defaultValue={defaultCashRecipientId ?? ""}
                >
                  {defaultCashRecipientId ? null : (
                    <option value="" disabled>
                      {t("retail.pay.selectPlaceholder")}
                    </option>
                  )}
                  {cashPayees.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role === "OWNER" ? t("retail.pay.roleOwner") : t("retail.pay.roleField")})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-zinc-500">
                {t("retail.pay.proofNote")}
                <input name="note" className="app-input mt-1" placeholder={t("retail.pay.cashNotePlaceholder")} />
              </label>
              <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
                {pending ? t("retail.pay.saving") : t("retail.pay.submitCash")}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
