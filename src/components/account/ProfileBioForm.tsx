"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { updateBioAction } from "@/server/actions/profile";

export function ProfileBioForm({ initialBio }: { initialBio: string }) {
  const [bio, setBio] = useState(initialBio);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData();
    fd.set("bio", bio);
    start(async () => {
      const r = await updateBioAction(fd);
      setMsg(r && "error" in r && r.error ? r.error : "Saved.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="app-card space-y-4">
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        Short note (optional)
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g. Store hours, preferred contact…"
          className="app-input mt-1.5 resize-none"
        />
      </label>
      {msg ? <p className="text-sm text-teal-300">{msg}</p> : null}
      <button type="submit" disabled={pending} className="app-btn-secondary disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
