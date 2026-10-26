import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizeRole, homeForRole } from "@/lib/auth/routes";

const matchesPath = (pathname, base) =>
  pathname === base || pathname.startsWith(`${base}/`);

export const proxy = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  const isAdminPage = matchesPath(pathname, "/Admin");
  const isListerPage = matchesPath(pathname, "/Lister");

  if (!isAdminPage && !isListerPage) return;

  await auth.protect();

  const { sessionClaims } = await auth();
  const role = normalizeRole(sessionClaims?.metadata?.role);

  if (isAdminPage && role !== "admin") {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  if (isListerPage && role !== "lister") {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }
});

export const config = {
  matcher: [
    "/",
    "/Admin",
    "/Admin/(.*)",
    "/Lister",
    "/Lister/(.*)",
    "/api/v1/((?!listings/public|listings/filters|payments/ipn|contact-access/ipn).*)",
    "/api/analytics/(.*)",
  ],
};
