import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-zinc-950 px-4 text-center">
      <h1 className="text-xl font-bold text-white">Access denied</h1>
      <Link href="/" className="app-btn px-10 py-3.5">
        OK
      </Link>
    </div>
  );
}
