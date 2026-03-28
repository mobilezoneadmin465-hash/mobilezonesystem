import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { resolveAuthSecret } from "@/lib/auth-secret";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/owner") && role !== "OWNER") {
      return NextResponse.redirect(new URL(role ? "/unauthorized" : "/login", req.url));
    }
    if (path.startsWith("/retail") && role !== "RETAIL") {
      return NextResponse.redirect(new URL(role ? "/unauthorized" : "/login", req.url));
    }
    if (path.startsWith("/sr") && role !== "SR") {
      return NextResponse.redirect(new URL(role ? "/unauthorized" : "/login", req.url));
    }

    return NextResponse.next();
  },
  {
    secret: resolveAuthSecret(),
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/owner/:path*", "/retail/:path*", "/sr/:path*"],
};
