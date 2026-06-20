import { betterFetch } from "@better-fetch/fetch";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_API = "http://localhost:3000/api/auth/get-session";

const publicRoutes = ["/", "/sign-in", "/sign-up", "/api/auth", "/api/share"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check session for protected routes
  try {
    const { data } = await betterFetch<{ user: { email: string } }>(
      SESSION_API,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!data) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
