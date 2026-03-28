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
  /** Mobile app: fill dynamic viewport + clip so only main scrolls; tab bar stays docked (no fixed + bounce). */
  const shell = isApp
    ? "flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-zinc-950 text-zinc-100 md:h-auto md:max-h-none md:min-h-screen md:overflow-visible"
    : "min-h-screen bg-slate-50 text-slate-900";
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

  /** Main scroll area padding; tab bar is in layout flow on mobile (no extra spacer). */
  const mainPadApp = "px-4 pt-4 pb-5 md:p-8 md:pb-8";
  const mainPadLight = "p-4 md:p-8";
  const mainPad = isApp ? mainPadApp : mainPadLight;

  const contentCol =
    isApp
      ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:overflow-visible"
      : "flex min-w-0 flex-1 flex-col";

  const mainScroll =
    isApp
      ? `${mainPad} flex-1 min-h-0 touch-manipulation overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] md:min-h-0 md:overflow-visible`
      : `${mainPad} flex-1 touch-manipulation`;

  /** >6 items (e.g. owner): one compact row, horizontal pan only — no visible scrollbar. */
  const compactTabBar = nav.length > 6;

  return (
    <div className={`${shell} ${isApp ? "" : "flex flex-col"}`}>
      <div className={`flex min-h-0 flex-1 ${isApp ? "min-h-0" : ""}`}>
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

        <div className={contentCol}>
          <header
            className={`z-30 flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 md:sticky md:top-0 md:hidden ${headerBorder}`}
          >
            <div className={`min-w-0 flex-1 ${isApp ? "pt-[env(safe-area-inset-top,0px)]" : ""}`}>
              <p className={`hidden text-[10px] font-semibold uppercase tracking-wider sm:block ${brand}`}>
                {t("shell.brand")}
              </p>
              <p className={`truncate text-base font-bold leading-tight ${titleCls}`}>{title}</p>
              {subtitle ? (
                <p className={`mt-0.5 hidden truncate text-xs leading-snug md:block ${subCls}`}>{subtitle}</p>
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
            <div className="shrink-0 border-b border-slate-200 bg-white md:hidden">
              <nav className="flex flex-wrap justify-center gap-2 px-3 py-2.5 pb-3">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-1.5 text-center text-[11px] font-medium leading-tight ${navLinkMobile}`}
                  >
                    {navLabel(item.href)}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}

          <main className={mainScroll}>{children}</main>

          {isApp ? (
            <nav
              className="mobile-bottom-nav z-40 shrink-0 border-t border-zinc-800 bg-zinc-950 shadow-[0_-6px_28px_rgba(0,0,0,0.55)] md:hidden"
              aria-label="Main"
            >
              <div
                className={
                  compactTabBar
                    ? "scrollbar-hide flex touch-pan-x items-stretch gap-0.5 overflow-x-auto px-2 py-1.5"
                    : "flex w-full items-stretch justify-between gap-0 px-1 pt-1"
                }
              >
                {nav.map((item) => {
                  const active = item.href === activeTab;
                  const tabBtn = `flex flex-col items-center justify-center gap-1 rounded-xl transition active:scale-[0.98] ${
                    compactTabBar
                      ? "min-w-[4.25rem] max-w-[5.25rem] shrink-0 px-1.5 py-2"
                      : "min-w-0 flex-1 px-1 py-2"
                  } ${active ? "bg-teal-500/20 text-teal-300" : "text-zinc-500 active:bg-zinc-800/90"}`;
                  return (
                    <Link key={item.href} href={item.href} className={tabBtn}>
                      <span className={`shrink-0 ${active ? "text-teal-400" : ""}`}>
                        <NavTabIcon href={item.href} />
                      </span>
                      <span
                        className={`line-clamp-2 w-full px-0.5 text-center text-[11px] font-semibold leading-tight ${
                          active ? "text-teal-100" : "text-zinc-400"
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
      </div>
    </div>
  );
}
