import type { Locale } from "./constants";

/** Sidebar labels by route (shared across roles where href matches). */
const LABELS: Record<string, Record<Locale, string>> = {
  "/owner/dashboard": { en: "Home", bn: "হোম" },
  "/owner/catalog": { en: "Stock", bn: "স্টক" },
  "/owner/shops": { en: "Stores", bn: "দোকান" },
  "/owner/place-order": { en: "Place order", bn: "অর্ডার দিন" },
  "/owner/orders": { en: "Orders", bn: "অর্ডার" },
  "/owner/orders/history": { en: "Past orders", bn: "পুরনো অর্ডার" },
  "/owner/analytics": { en: "Analytics", bn: "হিসাব" },
  "/owner/team": { en: "Field team", bn: "ফিল্ড টিম" },
  "/owner/payments": { en: "Approve pay", bn: "পেমেন্ট অনুমোদন" },
  "/owner/summary": { en: "Today", bn: "আজ" },
  "/owner/transactions": { en: "Activity", bn: "কার্যকলাপ" },
  "/owner/account": { en: "Profile", bn: "প্রোফাইল" },
  "/sr/dashboard": { en: "Home", bn: "হোম" },
  "/sr/to-deliver": { en: "To deliver", bn: "ডেলিভারি" },
  "/sr/warehouse": { en: "Warehouse", bn: "গুদাম" },
  "/sr/office": { en: "Office", bn: "অফিস" },
  "/sr/deliveries": { en: "Shipments", bn: "চালান" },
  "/retail": { en: "Home", bn: "হোম" },
  "/retail/place-order": { en: "Order", bn: "অর্ডার" },
  "/retail/deliveries": { en: "Receive", bn: "গ্রহণ" },
  "/retail/orders": { en: "Orders", bn: "অর্ডার" },
  "/retail/pay": { en: "Pay due", bn: "বাকি পরিশোধ" },
  "/retail/account": { en: "Profile", bn: "প্রোফাইল" },
};

export function navLabelForHref(locale: Locale, href: string): string {
  const row = LABELS[href];
  if (!row) return href;
  return row[locale] ?? row.en;
}
