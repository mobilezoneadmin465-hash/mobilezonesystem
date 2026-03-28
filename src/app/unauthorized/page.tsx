import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-center">
      <h1 className="text-xl font-semibold text-white">Wrong area</h1>
      <p className="max-w-sm text-sm text-zinc-500">Use the account for this area.</p>
      <Link href="/" className="app-btn">
        Home
      </Link>
    </div>
  );
}
