"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { registerOwnerAction } from "@/server/actions/register";

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
    <form onSubmit={onSubmit} className="app-card space-y-4">
      <h1 className="text-xl font-semibold text-white">Owner</h1>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        Full name
        <input name="name" required autoComplete="name" className="app-input mt-1.5" />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        Username (sign in)
        <input
          name="username"
          required
          autoComplete="username"
          className="app-input mt-1.5"
          placeholder="lowercase, e.g. nahin"
        />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        Email
        <input name="email" type="email" required autoComplete="email" className="app-input mt-1.5" />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        Phone
        <input name="phone" type="tel" required autoComplete="tel" className="app-input mt-1.5" />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        Password (min 8 characters)
        <input name="password" type="password" required autoComplete="new-password" className="app-input mt-1.5" />
      </label>
      <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
        {pending ? "Creating…" : "Create owner account"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        <Link href="/register" className="text-teal-400 hover:text-teal-300">
          ← Other roles
        </Link>
      </p>
    </form>
  );
}

export function RegisterSrForm() {
  return (
    <div className="app-card space-y-4">
      <h1 className="text-xl font-semibold text-white">Field / sales</h1>
      <p className="text-sm text-zinc-400">
        You can’t create your own account here. Your owner adds you from{" "}
        <strong className="text-zinc-200">Owner → Field team</strong> with a username and 6-digit PIN. Use those on the
        sign-in page.
      </p>
      <Link href="/login" className="app-btn block w-full text-center">
        Back to sign in
      </Link>
      <p className="text-center text-sm text-zinc-500">
        <Link href="/register" className="text-teal-400 hover:text-teal-300">
          ← Registration options
        </Link>
      </p>
    </div>
  );
}

export function RegisterRetailForm() {
  return (
    <div className="app-card space-y-4">
      <h1 className="text-xl font-semibold text-white">Retail</h1>
      <p className="text-sm text-zinc-400">
        Store logins are created by your supplier’s owner. They add a <strong className="text-zinc-200">store</strong>{" "}
        under <strong className="text-zinc-200">Stores</strong>, then add staff with a username and PIN on that store’s
        page.
      </p>
      <Link href="/login" className="app-btn block w-full text-center">
        Back to sign in
      </Link>
      <p className="text-center text-sm text-zinc-500">
        <Link href="/register" className="text-teal-400 hover:text-teal-300">
          ← Registration options
        </Link>
      </p>
    </div>
  );
}
