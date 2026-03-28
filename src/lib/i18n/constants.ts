export const LOCALE_STORAGE_KEY = "mz-locale";

/** HttpOnly-less cookie so server components can render the same locale after refresh. */
export const LOCALE_COOKIE_NAME = "mz-locale";

export type Locale = "en" | "bn";

export const LOCALES: Locale[] = ["en", "bn"];

export function isLocale(v: string | null | undefined): v is Locale {
  return v === "en" || v === "bn";
}
