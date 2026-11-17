import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { marketingFeatures } from "@/lib/marketing/content";
import { getPublicSiteOrigin } from "@/lib/marketing/seo";

export const dynamic = "force-dynamic";
const locales = ["ar", "en"] as const;

function localizedPath(locale: string, path: string) {
  return `/${locale}${path === "/" ? "" : path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPublicSiteOrigin();
  if (!origin) return [];

  const staticPaths = ["/", "/features", "/pricing", "/about", "/contact", "/faq", "/terms", "/privacy"];
  const restaurantRecords = await db.restaurant.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  const paths = [
    ...staticPaths.map((path) => ({ path, lastModified: new Date(), priority: path === "/" ? 1 : 0.7 })),
    ...marketingFeatures.map((feature) => ({ path: `/features/${feature.slug}`, lastModified: new Date(), priority: 0.6 })),
    ...restaurantRecords.map((restaurant) => ({ path: `/r/${encodeURIComponent(restaurant.slug)}`, lastModified: restaurant.updatedAt, priority: 0.6 })),
  ];

  return paths.flatMap((page) => {
    const alternatives = Object.fromEntries(locales.map((locale) => [locale, `${origin}${localizedPath(locale, page.path)}`]));
    return locales.map((locale) => ({
      url: `${origin}${localizedPath(locale, page.path)}`,
      lastModified: page.lastModified,
      changeFrequency: page.path === "/" ? "weekly" as const : "monthly" as const,
      priority: page.priority,
      alternates: { languages: alternatives },
    }));
  });
}
