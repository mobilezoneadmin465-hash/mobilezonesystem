"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  type Locale,
  isLocale,
} from "@/lib/i18n/constants";
import { translatePath } from "@/lib/i18n/messages";
import { useRouter } from "next/navigation";
import { navLabelForHref } from "@/lib/i18n/nav-labels";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string) => string;
  navLabel: (href: string) => string;
  mounted: boolean;
};

const LanguageContext = createContext<Ctx | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "";
  if (nav.startsWith("bn")) return "bn";
  return "en";
}

function applyDomLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "bn" ? "bn" : "en";
  document.documentElement.classList.toggle("locale-bn", locale === "bn");
}

/** Sync cookie so server components match client locale after refresh. */
function setLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readStoredLocale();
    setLocaleState(initial);
    applyDomLocale(initial);
    setLocaleCookie(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    applyDomLocale(locale);
    setLocaleCookie(locale);
  }, [locale, mounted]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== LOCALE_STORAGE_KEY || !isLocale(e.newValue)) return;
      setLocaleState(e.newValue);
      applyDomLocale(e.newValue);
      setLocaleCookie(e.newValue);
      router.refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, l);
      } catch {
        /* ignore */
      }
      applyDomLocale(l);
      setLocaleCookie(l);
      router.refresh();
    },
    [router]
  );

  const t = useCallback((path: string) => translatePath(locale, path), [locale]);

  const navLabel = useCallback((href: string) => navLabelForHref(locale, href), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, navLabel, mounted }),
    [locale, setLocale, t, navLabel, mounted]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
