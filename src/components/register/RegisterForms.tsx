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
  return (
    <div className="space-y-6 rounded-t-[1.75rem] border border-zinc-800/80 bg-zinc-900/95 px-5 py-10 text-center sm:rounded-3xl sm:p-10">
      <h1 className="text-xl font-bold text-white">Field</h1>
      <Link href="/login" className="app-btn block w-full py-4 text-center">
        Sign in
      </Link>
      <Link href="/register" className="block text-sm text-teal-400">
        Back
      </Link>
    </div>
  );
}

export function RegisterRetailForm() {
  return (
    <div className="space-y-6 rounded-t-[1.75rem] border border-zinc-800/80 bg-zinc-900/95 px-5 py-10 text-center sm:rounded-3xl sm:p-10">
      <h1 className="text-xl font-bold text-white">Retail</h1>
      <Link href="/login" className="app-btn block w-full py-4 text-center">
        Sign in
      </Link>
      <Link href="/register" className="block text-sm text-teal-400">
        Back
      </Link>
    </div>
  );
}
