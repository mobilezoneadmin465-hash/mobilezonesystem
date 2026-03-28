"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NavTabIcon } from "@/components/mobile-nav-icons";
import { SignOutButton } from "@/components/SignOutButton";

export type NavItem = { href: string };

/** Longest href wins so `/owner/orders/history` beats `/owner/orders`. */
function activeNavHref(pathname: string, nav: NavItem[]): string | null {
  const sorted = [...nav].sort((a, b) => b.href.length - a.href.length);
  for (const item of sorted) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.href;
    }
  }
  return null;
}

export function DashboardShell({
  titleKey,
  subtitle,
  nav,
  children,
  theme = "light",
}: {
  /** e.g. role.owner, role.field, role.retail */
  titleKey: string;
  subtitle?: string;
  nav: NavItem[];
  children: ReactNode;
  theme?: "light" | "app";
}) {
  const pathname = usePathname();
  const { t, navLabel } = useLanguage();
  const title = t(titleKey);
  const isApp = theme === "app";
  const shell = isApp ? "min-h-dvh bg-zinc-950 text-zinc-100" : "min-h-screen bg-slate-50 text-slate-900";
  const aside = isApp ? "border-zinc-800 bg-zinc-900/90" : "border-slate-200 bg-white";
  const brand = isApp ? "text-teal-400" : "text-teal-600";
  const titleCls = isApp ? "text-white" : "text-slate-900";
  const subCls = isApp ? "text-zinc-500" : "text-slate-500";
  const navLink = isApp
    ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  const navLinkMobile = isApp ? "bg-zinc-800 text-zinc-200" : "bg-slate-100 text-slate-700";
  const headerBorder = isApp ? "border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl" : "border-slate-200 bg-white";
  const activeTab = isApp ? activeNavHref(pathname, nav) : null;

  /** Bottom tab bar + home indicator safe area — mobile app shell only */
  const mainPadApp =
    "px-4 pt-4 pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:p-8 md:pb-8";
  const mainPadLight = "p-4 md:p-8";
  const mainPad = isApp ? mainPadApp : mainPadLight;

  return (
    <div className={`${shell} flex flex-col`}>
      <div className="flex min-h-0 flex-1">
        <aside className={`hidden w-60 flex-shrink-0 flex-col border-r md:flex ${aside}`}>
          <div className={`border-b px-5 py-4 ${isApp ? "border-zinc-800" : "border-slate-100"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${brand}`}>{t("shell.brand")}</p>
            <p className={`mt-1 text-lg font-semibold ${titleCls}`}>{title}</p>
            {subtitle ? <p className={`mt-0.5 text-sm ${subCls}`}>{subtitle}</p> : null}
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${navLink}`}
              >
                {navLabel(item.href)}
              </Link>
            ))}
          </nav>
          <div className={`space-y-2 border-t p-3 ${isApp ? "border-zinc-800" : "border-slate-100"}`}>
            <p className={`px-1 text-[10px] font-semibold uppercase tracking-wider ${subCls}`}>
              {t("shell.language")}
            </p>
            <LanguageToggle variant="shell" className="w-full justify-center" />
            <SignOutButton variant={isApp ? "app" : "light"} className="w-full" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={`sticky top-0 z-30 flex items-start justify-between gap-3 border-b px-4 py-3 md:hidden ${headerBorder}`}
          >
            <div className={`min-w-0 flex-1 ${isApp ? "pt-[env(safe-area-inset-top,0px)]" : ""}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${brand}`}>{t("shell.brand")}</p>
              <p className={`truncate text-sm font-semibold leading-tight ${titleCls}`}>{title}</p>
              {subtitle ? (
                <p className={`mt-0.5 truncate text-xs leading-snug ${subCls}`}>{subtitle}</p>
              ) : null}
            </div>
            <div
              className={`flex shrink-0 items-center gap-2 ${isApp ? "pt-[env(safe-area-inset-top,0px)]" : ""}`}
            >
              <LanguageToggle variant="shell" />
              <SignOutButton variant={isApp ? "app" : "light"} />
            </div>
          </header>

          {!isApp ? (
            <div className="border-b border-slate-200 bg-white md:hidden">
              <nav className="flex gap-2 overflow-x-auto px-3 py-2.5 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${navLinkMobile}`}
                  >
                    {navLabel(item.href)}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}

          <main className={`flex-1 touch-manipulation ${mainPad}`}>{children}</main>
        </div>
      </div>

      {isApp ? (
        <nav
          className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/90 bg-zinc-950/90 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl md:hidden"
          aria-label="Main"
        >
          <div className="flex snap-x snap-mandatory gap-0.5 overflow-x-auto px-1.5 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nav.map((item) => {
              const active = item.href === activeTab;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-[4.25rem] max-w-[5.5rem] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 transition active:scale-[0.97] ${
                    active ? "bg-teal-500/15 text-teal-300" : "text-zinc-500 active:bg-zinc-800/80"
                  }`}
                >
                  <span className={active ? "text-teal-400" : ""}>
                    <NavTabIcon href={item.href} />
                  </span>
                  <span
                    className={`line-clamp-2 w-full text-center text-[10px] font-medium leading-tight ${
                      active ? "text-teal-200" : "text-zinc-400"
                    }`}
                  >
                    {navLabel(item.href)}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
