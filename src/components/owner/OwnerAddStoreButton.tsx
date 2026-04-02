"use client";

import Link from "next/link";

export function OwnerAddStoreButton() {
  return (
    <Link href="/owner/approvals/stores" className="app-btn-secondary py-2.5 text-sm">
      Approve stores
    </Link>
  );
}
