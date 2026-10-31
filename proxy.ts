// proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizeRole, homeForRole } from "@/lib/auth/routes";

const matchesPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export const proxy = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  const isAdminPage = matchesPath(pathname, "/Admin");
  const isListerPage = matchesPath(pathname, "/Lister");

  if (!isAdminPage && !isListerPage) return;

  await auth.protect();

  const { sessionClaims } = await auth();
  const rawRole = (sessionClaims?.metadata as { role?: string } | undefined)
    ?.role;

  // Claim absent from token: do not guess. Server-side requireRole/requireAdmin decides.
  if (rawRole === undefined) return;

  const role = normalizeRole(rawRole);

  if (
    (isAdminPage && role === "admin") ||
    (isListerPage && role === "lister")
  ) {
    return;
  }

  const target = homeForRole(role);

  // Loop guard: never redirect to the path already being served.
  if (matchesPath(pathname, target)) return;

  return NextResponse.redirect(new URL(target, request.url));
});

export const config = {
  matcher: [
    "/",
    "/Admin",
    "/Admin/(.*)",
    "/Lister",
    "/Lister/(.*)",
    "/properties/(.*)",
    "/api/v1/((?!listings/public|listings/filters|payments/ipn|contact-access/ipn).*)",
    "/api/analytics/(.*)",
  ],
};