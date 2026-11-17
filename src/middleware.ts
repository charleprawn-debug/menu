import { NextRequest, NextResponse } from "next/server";

const supportedLocales = new Set(["ar", "en"]);
const localeCookie = "df_locale";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const firstSegment = pathname.split("/")[1];

  if (supportedLocales.has(firstSegment)) {
    const locale = firstSegment;
    const rewritten = request.nextUrl.clone();
    const rest = pathname.slice(locale.length + 2);
    rewritten.pathname = rest ? `/${rest}` : "/";
    const requestHeaders = new Headers(request.headers);
    const cookieParts = (request.headers.get("cookie") || "")
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith(`${localeCookie}=`));
    cookieParts.push(`${localeCookie}=${locale}`);
    requestHeaders.set("cookie", cookieParts.join("; "));
    const response = NextResponse.rewrite(rewritten, { request: { headers: requestHeaders } });
    response.cookies.set(localeCookie, locale, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  const storedLocale = request.cookies.get(localeCookie)?.value;
  const locale = storedLocale && supportedLocales.has(storedLocale) ? storedLocale : "ar";
  const destination = request.nextUrl.clone();
  destination.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(destination, 307);
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manus-routes.json|images/).*)"],
};
