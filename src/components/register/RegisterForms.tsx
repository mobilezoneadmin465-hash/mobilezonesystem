"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerOwnerAction, registerRetailAction, registerSrAction } from "@/server/actions/register";

export function RegisterOwnerForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const r = await registerOwnerAction(fd);
      if (r && "error" in r && r.error) setError(r.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-t-[1.75rem] border border-zinc-800/80 bg-zinc-900/95 px-5 py-8 sm:rounded-3xl sm:p-8">
      <h1 className="text-xl font-bold text-white">Owner</h1>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Name</span>
        <input name="name" required autoComplete="name" className="app-input" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Username</span>
        <input name="username" required autoComplete="username" className="app-input" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Email</span>
        <input name="email" type="email" required autoComplete="email" className="app-input" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Phone</span>
        <input name="phone" type="tel" required autoComplete="tel" className="app-input" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Password</span>
        <input name="password" type="password" required autoComplete="new-password" className="app-input" />
      </label>
      <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
        {pending ? "…" : "Create"}
      </button>
      <Link href="/register" className="block py-2 text-center text-sm font-medium text-teal-400">
        Back
      </Link>
    </form>
  );
}

export function RegisterSrForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const username = String(fd.get("username") ?? "");
    const pin = String(fd.get("pin") ?? "");

    setError(null);
    startTransition(async () => {
      const r = await registerSrAction(fd);
      if (r && "error" in r && r.error) {
        setError(r.error);
        return;
      }

      // Sign in immediately (PIN by default). Layout will show “pending approval” screen.
      const res = await signIn("credentials", { username, password: pin, redirect: false });
      if (res?.error) {
        setError("Sign-in failed. Please try again.");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-t-[1.75rem] border border-zinc-800/80 bg-zinc-900/95 px-5 py-8 sm:rounded-3xl sm:p-8">
      <h1 className="text-xl font-bold text-white">Field team (register)</h1>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Display name</span>
        <input name="name" required autoComplete="name" className="app-input" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Username</span>
        <input name="username" required autoComplete="username" className="app-input" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Field role (optional)</span>
        <input name="fieldRoleName" className="app-input" placeholder="e.g. Senior rep" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">6-digit PIN</span>
        <input name="pin" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="off" className="app-input" placeholder="••••••" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Phone (optional)</span>
        <input name="phone" type="tel" autoComplete="tel" className="app-input" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Password (for later)</span>
        <input name="password" type="password" required autoComplete="new-password" className="app-input" />
      </label>

      <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
        {pending ? "Creating…" : "Create field account"}
      </button>

      <div className="space-y-2 pt-2">
        <Link href="/register" className="block text-sm text-teal-400">
          Back
        </Link>
      </div>
    </form>
  );
}

export function RegisterRetailForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const username = String(fd.get("username") ?? "");
    const pin = String(fd.get("pin") ?? "");

    setError(null);
    startTransition(async () => {
      const r = await registerRetailAction(fd);
      if (r && "error" in r && r.error) {
        setError(r.error);
        return;
      }

      const res = await signIn("credentials", { username, password: pin, redirect: false });
      if (res?.error) {
        setError("Sign-in failed. Please try again.");
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-t-[1.75rem] border border-zinc-800/80 bg-zinc-900/95 px-5 py-8 sm:rounded-3xl sm:p-8">
      <h1 className="text-xl font-bold text-white">Store account (register)</h1>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Shop name</span>
        <input name="shopName" required autoComplete="organization" className="app-input" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Proprietor name</span>
        <input name="ownerName" required autoComplete="name" className="app-input" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Shop phone</span>
        <input name="shopPhone" type="tel" required autoComplete="tel" className="app-input" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Address</span>
        <textarea name="address" required rows={3} className="app-input mt-1 resize-none" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Staff display name</span>
        <input name="name" required autoComplete="name" className="app-input" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Username</span>
        <input name="username" required autoComplete="username" className="app-input" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">6-digit PIN</span>
        <input name="pin" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="off" className="app-input" placeholder="••••••" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Phone (optional)</span>
        <input name="phone" type="tel" autoComplete="tel" className="app-input" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Password (for later)</span>
        <input name="password" type="password" required autoComplete="new-password" className="app-input" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Credit limit (optional, BDT)
        </span>
        <input name="creditLimit" type="text" className="app-input" placeholder="0" />
      </label>

      <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
        {pending ? "Creating…" : "Create store account"}
      </button>

      <Link href="/register" className="block text-center text-sm text-teal-400">
        Back
      </Link>
    </form>
  );
}
