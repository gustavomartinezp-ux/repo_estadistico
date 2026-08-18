import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Único gate de autenticación de la app: protege /cargar (página) y
 * /api/upload-informe (API). Todo lo demás -el dashboard, /api/atenciones-
 * queda abierto sin login, a propósito.
 */
export function middleware(request: NextRequest) {
  const isAuthenticated = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (isAuthenticated) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  runtime: "nodejs",
  matcher: ["/cargar/:path*", "/api/upload-informe", "/api/upload-informe/:path*"],
};
