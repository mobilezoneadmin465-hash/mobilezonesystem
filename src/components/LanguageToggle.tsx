"use client";

import { useLanguage } from "@/components/LanguageContext";
import type { Locale } from "@/lib/i18n/constants";

const btnBase =
  "min-h-9 min-w-[3.25rem] touch-manipulation rounded-lg px-2.5 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 sm:min-h-0 sm:py-1.5";

export function LanguageToggle({
  variant = "shell",
  className = "",
}: {
  variant?: "shell" | "login";
  className?: string;
}) {
  const { locale, setLocale, t } = useLanguage();

  const active = variant === "login" ? "bg-teal-600 text-white" : "bg-zinc-700 text-white";
  const idle =
    variant === "login"
      ? "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300";

  function pick(next: Locale) {
    setLocale(next);
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border p-1 ${variant === "shell" ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-700 bg-zinc-900/40"} ${className}`}
      role="group"
      aria-label={t("shell.language")}
    >
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => pick("en")}
        className={`${btnBase} ${locale === "en" ? active : idle}`}
      >
        {t("shell.english")}
      </button>
      <button
        type="button"
        aria-pressed={locale === "bn"}
        onClick={() => pick("bn")}
        className={`${btnBase} ${locale === "bn" ? active : idle}`}
      >
        {t("shell.bangla")}
      </button>
    </div>
  );
}
