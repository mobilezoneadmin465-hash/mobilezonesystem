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

  return (
    <div className="app-card relative mx-auto w-full max-w-md space-y-6 border-teal-500/20 p-8">
      <div className="absolute right-4 top-4">
        <LanguageToggle variant="login" />
      </div>

      <div className="pr-24">
        <h1 className="text-2xl font-semibold text-white">{t("login.title")}</h1>
        {registered ? (
          <p className="mt-3 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-sm text-teal-200">
            {t("login.registeredHint")}
          </p>
        ) : null}
      </div>

      {step === 1 ? (
        <form onSubmit={handleHint} className="space-y-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("login.usernameLabel")}
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
              className="app-input mt-1.5"
              placeholder={t("login.usernamePlaceholder")}
            />
          </label>
          <p className="text-xs text-zinc-600">{t("login.usernameHelp")}</p>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" disabled={hintLoading} className="app-btn w-full disabled:opacity-50">
            {hintLoading ? t("login.checking") : t("login.continue")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignIn} className="space-y-4">
          <button type="button" onClick={goBack} className="text-sm text-teal-400 hover:text-teal-300">
            {t("login.changeUser")}
          </button>
          <p className="text-sm text-zinc-400">
            {t("login.signingInAs")}{" "}
            <span className="font-medium text-zinc-200">{identifier.trim()}</span>
          </p>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            {authType === "pin" ? t("login.pinLabel") : t("login.passwordLabel")}
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete={authType === "pin" ? "one-time-code" : "current-password"}
              inputMode={authType === "pin" ? "numeric" : undefined}
              pattern={authType === "pin" ? "[0-9]*" : undefined}
              maxLength={authType === "pin" ? 6 : undefined}
              required
              className="app-input mt-1.5"
              placeholder={authType === "pin" ? "••••••" : undefined}
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
            {pending ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-zinc-500">
        {t("login.newBusiness")}{" "}
        <Link href="/register/owner" className="font-medium text-teal-400 hover:text-teal-300">
          {t("login.registerOwner")}
        </Link>
      </p>
    </div>
  );
}
