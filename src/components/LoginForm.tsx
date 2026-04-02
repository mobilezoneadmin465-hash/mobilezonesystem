"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

type AuthType = "password" | "pin";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const { t } = useLanguage();

  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [authType, setAuthType] = useState<AuthType | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const regHint = t("login.registeredHint").trim();

  async function handleHint(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const id = identifier.trim();
    if (!id) {
      setError(t("login.errEmptyUser"));
      return;
    }
    setHintLoading(true);
    try {
      const res = await fetch("/api/auth/login-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: id }),
      });
      if (!res.ok) {
        setError(t("login.errNotFound"));
        return;
      }
      const data = (await res.json()) as { authType: AuthType };
      setAuthType(data.authType);
      setSecret("");
      setStep(2);
    } catch {
      setError(t("login.errGeneric"));
    } finally {
      setHintLoading(false);
    }
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("credentials", {
      username: identifier.trim(),
      password: secret,
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError(authType === "pin" ? t("login.errWrongPin") : t("login.errWrongPassword"));
      return;
    }
    router.push("/");
    router.refresh();
  }

  function goBack() {
    setStep(1);
    setAuthType(null);
    setSecret("");
    setError(null);
  }

  const signingAs = t("login.signingInAs").trim();
  const newBiz = t("login.newBusiness").trim();

  return (
    <div className="relative mx-auto w-full max-w-md rounded-t-[1.75rem] border border-zinc-800/80 bg-zinc-900/95 px-5 pb-10 pt-8 shadow-2xl sm:rounded-3xl sm:border-teal-500/15 sm:p-8">
      <div className="absolute right-4 top-6 sm:right-5 sm:top-8">
        <LanguageToggle variant="login" />
      </div>

      <div className="pr-14">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t("login.title")}</h1>
        {registered && regHint ? (
          <p className="mt-3 rounded-xl border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-sm text-teal-200">
            {regHint}
          </p>
        ) : null}
      </div>

      {step === 1 ? (
        <form onSubmit={handleHint} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {t("login.usernameLabel")}
            </span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
              className="app-input"
              placeholder={t("login.usernamePlaceholder")}
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" disabled={hintLoading} className="app-btn w-full disabled:opacity-50">
            {hintLoading ? t("login.checking") : t("login.continue")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignIn} className="mt-8 space-y-5">
          <button type="button" onClick={goBack} className="text-sm font-medium text-teal-400 active:text-teal-300">
            {t("login.changeUser")}
          </button>
          {signingAs ? (
            <p className="text-sm text-zinc-400">
              {signingAs} <span className="font-medium text-zinc-100">{identifier.trim()}</span>
            </p>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {authType === "pin" ? t("login.pinLabel") : t("login.passwordLabel")}
            </span>
            {authType === "pin" ? (
              <button
                type="button"
                onClick={() => setAuthType("password")}
                className="mb-2 text-xs font-medium text-teal-400 hover:text-teal-300"
              >
                Use password instead
              </button>
            ) : null}
            {authType === "password" ? (
              <button
                type="button"
                onClick={() => setAuthType("pin")}
                className="mb-2 text-xs font-medium text-teal-400 hover:text-teal-300"
              >
                Use PIN instead
              </button>
            ) : null}
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete={authType === "pin" ? "one-time-code" : "current-password"}
              inputMode={authType === "pin" ? "numeric" : undefined}
              pattern={authType === "pin" ? "[0-9]*" : undefined}
              maxLength={authType === "pin" ? 6 : undefined}
              required
              className="app-input"
              placeholder={authType === "pin" ? "••••••" : "••••••••"}
              autoFocus
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
            {pending ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>
      )}

      <div className="mt-8 text-center">
        {newBiz ? (
          <p className="text-sm text-zinc-500">
            {newBiz}{" "}
            <Link href="/register/owner" className="font-semibold text-teal-400 active:text-teal-300">
              {t("login.registerOwner")}
            </Link>
          </p>
        ) : (
          <Link href="/register/owner" className="text-sm font-semibold text-teal-400 active:text-teal-300">
            {t("login.registerOwner")}
          </Link>
        )}
      </div>
    </div>
  );
}
