import type { Metadata } from "next";
import type { Locale } from "@/lib/marketing/content";

export function getPublicSiteOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function marketingMetadata(
  locale: Locale,
  content: Record<Locale, { title: string; description: string }>,
  path: string
): Metadata {
  const page = content[locale];
  const origin = getPublicSiteOrigin();
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  const localizedPath = `/${locale}${normalizedPath}`;
  const canonical = origin ? `${origin}${localizedPath}` : undefined;
  return {
    title: page.title,
    description: page.description,
    alternates: origin ? {
      canonical,
      languages: {
        ar: `${origin}/ar${normalizedPath}`,
        en: `${origin}/en${normalizedPath}`,
      },
    } : undefined,
    openGraph: {
      type: "website",
      siteName: "DineFlow",
      title: page.title,
      description: page.description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
  };
}
