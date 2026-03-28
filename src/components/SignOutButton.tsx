"use client";

import { signOut } from "next-auth/react";
import { useLanguage } from "@/components/LanguageContext";

export function SignOutButton({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "app";
  className?: string;
}) {
  const { t } = useLanguage();
  const cls =
    variant === "app"
      ? "inline-flex min-h-10 touch-manipulation items-center justify-center rounded-xl border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 sm:min-h-0 sm:py-2"
      : "touch-manipulation rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:py-1.5";

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={`${cls} ${className}`.trim()}
    >
      {t("shell.signOut")}
    </button>
  );
}
