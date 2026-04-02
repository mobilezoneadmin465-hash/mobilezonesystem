"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { finishPreparedDeliveryAction } from "@/server/actions/stock";

export function FinishPreparedDeliveryButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await finishPreparedDeliveryAction(orderId);
          if (r && "error" in r && r.error) {
            alert(r.error);
            return;
          }
          router.refresh();
        })
      }
      className="app-btn w-full py-2.5 text-sm disabled:opacity-50"
    >
      {pending ? "Finishing…" : "Finish delivery"}
    </button>
  );
}

