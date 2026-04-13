import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./lib/auth";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard /admin/dashboard routes
  if (!pathname.startsWith("/admin/dashboard")) {
    return NextResponse.next();
  }

  const token =
    req.cookies.get("access_token")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    null;

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  try {
    verifyAccessToken(token);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/admin/login", req.url));
    response.cookies.delete("access_token");
    return response;
  }
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
