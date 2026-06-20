import { betterFetch } from "@better-fetch/fetch";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_API = "http://localhost:3000/api/auth/get-session";

const authRoutes = ["/sign-in", "/sign-up"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const isAuthRoute = pathname === "/" || authRoutes.includes(pathname);
  const isProtectedRoute = !isAuthRoute;

  try {
    const { data } = await betterFetch<{ user: { email: string } }>(
      SESSION_API,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (isAuthRoute && data) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (isProtectedRoute && !data) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch {
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
