import { cookies } from "next/headers";
import { LOCALE_COOKIE_NAME, type Locale, isLocale } from "@/lib/i18n/constants";
import { translatePath } from "@/lib/i18n/messages";

export async function getServerLocale(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE_NAME)?.value;
  return isLocale(raw) ? raw : "en";
}

/** Use in server components: `const t = await getT();` then `t("retail.orders.title")`. */
export async function getT(): Promise<(path: string) => string> {
  const locale = await getServerLocale();
  return (path: string) => translatePath(locale, path);
}
