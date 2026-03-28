"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { srLogCashPaymentAction } from "@/server/actions/pay";

export function SrPaymentsClient({ shops }: { shops: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setOk(false);
    const fd = new FormData(form);
    start(async () => {
      const r = await srLogCashPaymentAction(fd);
      if (r && "error" in r && r.error) setError(r.error);
      else {
        setOk(true);
        form.reset();
        router.refresh();
      }
    });
  }

  if (!shops.length) {
    return <p className="text-sm text-zinc-500">No retail stores yet.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="app-card max-w-md space-y-4">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {ok ? <p className="text-sm text-teal-300">Logged. Waiting for owner approval.</p> : null}
      <label className="text-xs text-zinc-500">
        Store
        <select name="shopId" required className="app-input mt-1">
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-zinc-500">
        Amount (BDT)
        <input name="amount" type="text" required className="app-input mt-1" />
      </label>
      <label className="text-xs text-zinc-500">
        Note (optional)
        <input name="note" className="app-input mt-1" />
      </label>
      <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
        {pending ? "Saving…" : "Submit log"}
      </button>
    </form>
  );
}
