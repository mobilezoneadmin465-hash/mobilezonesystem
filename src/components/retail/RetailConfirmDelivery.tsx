"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { confirmRetailDeliveryAction } from "@/server/actions/stock";
import { useLanguage } from "@/components/LanguageContext";

export function RetailConfirmDelivery({ deliveryId }: { deliveryId: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await confirmRetailDeliveryAction(deliveryId);
          if (r && "error" in r && r.error) {
            alert(r.error);
            return;
          }
          router.refresh();
        })
      }
      className="app-btn shrink-0 py-2 text-sm disabled:opacity-50"
    >
      {pending ? t("retail.confirm.receiving") : t("retail.confirm.receive")}
    </button>
  );
}
