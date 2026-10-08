import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const matchesPath = (pathname, base) =>
  pathname === base || pathname.startsWith(`${base}/`);

export const proxy = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  const isAdminPage = matchesPath(pathname, "/Admin");
  const isListerPage = matchesPath(pathname, "/Lister");

  if (isAdminPage || isListerPage) {
    await auth.protect();
  }

  if (isAdminPage) {
    const { sessionClaims } = await auth();
    if (sessionClaims?.metadata?.role !== "admin") {
      return NextResponse.redirect(new URL("/Lister", request.url));
    }
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
