import { NextRequest, NextResponse } from "next/server";

// Allowed Host headers for the local API server (LSF-2026-005 — DNS rebinding guard).
// The Next.js standalone server binds to 127.0.0.1:1422; only requests that
// carry a matching Host header are accepted on the /api/* namespace.
const ALLOWED_HOSTS = new Set(["127.0.0.1:1422", "localhost:1422"]);

export function proxy(request: NextRequest): NextResponse {
  const host = request.headers.get("host") ?? "";
  if (!ALLOWED_HOSTS.has(host)) {
    return new NextResponse(null, { status: 421 }); // 421 Misdirected Request
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
