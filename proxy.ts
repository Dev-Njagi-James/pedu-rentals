// proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizeRole } from "@/lib/auth/routes";

const matchesPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export const proxy = clerkMiddleware(async (auth, request) => {
  const { pathname, search } = request.nextUrl;
  const isAdminPage = matchesPath(pathname, "/Admin");
  const isListerPage = matchesPath(pathname, "/Lister");

  if (!isAdminPage && !isListerPage) return;

  const { userId, sessionClaims } = await auth();

  // Signed out: send to /Auth and return here after sign-in.
  if (!userId) {
    const redirectUrl = encodeURIComponent(pathname + search);
    return NextResponse.redirect(
      new URL(`/Auth?redirect_url=${redirectUrl}`, request.url),
    );
  }

  const rawRole = (sessionClaims?.metadata as { role?: string } | undefined)
    ?.role;

  // Claim absent from token: do not guess. Page-level check decides.
  if (rawRole === undefined) return;

  const role = normalizeRole(rawRole);

  if (isListerPage) {
    // Admins must never see the lister dashboard.
    if (role === "admin") {
      return NextResponse.redirect(new URL("/Admin", request.url));
    }
    return;
  }

  // isAdminPage: signed-in non-admins are redirected away.
  if (role !== "admin") {
    const target = role === "user" ? "/" : "/Lister";
    return NextResponse.redirect(new URL(target, request.url));
  }
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
    "/api/adminRo/(.*)",
  ],
};