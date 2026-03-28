"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

export function SummaryDateForm({ initial }: { initial?: string }) {
  const router = useRouter();
  const [date, setDate] = useState(
    initial ?? new Date().toISOString().slice(0, 10)
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(`/owner/summary?date=${encodeURIComponent(date)}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-zinc-500">
        Day
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="app-input mt-1 w-auto"
        />
      </label>
      <button type="submit" className="app-btn py-2 text-sm">
        Show
      </button>
    </form>
  );
}
