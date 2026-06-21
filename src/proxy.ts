import { NextRequest, NextResponse } from "next/server";

// Allowed Host headers for the local API server (LSF-2026-005 — DNS rebinding guard).
// The Next.js standalone server binds to 127.0.0.1:1422; only requests that
// carry a matching Host header are accepted on the /api/* namespace.
// In development the dev server runs on localhost:3000, so the guard is skipped.
const ALLOWED_HOSTS = new Set(["127.0.0.1:1422", "localhost:1422"]);

export function proxy(request: NextRequest): NextResponse {
  // DNS rebinding guard only applies in production (standalone server on :1422).
  // In dev mode (next dev on :3000) the Host will be localhost:3000, which is fine.
  if (process.env.NODE_ENV === "production") {
    const host = request.headers.get("host") ?? "";
    if (!ALLOWED_HOSTS.has(host)) {
      return new NextResponse(null, { status: 421 }); // 421 Misdirected Request
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
