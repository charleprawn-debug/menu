import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "@/lib/marketing/seo";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/", "/app/", "/admin", "/onboarding", "/kitchen", "/pos", "/waiter",
        "/ar/api/", "/ar/app/", "/ar/admin", "/ar/onboarding", "/ar/login", "/ar/register", "/ar/forgot-password", "/ar/reset-password", "/ar/suspended",
        "/en/api/", "/en/app/", "/en/admin", "/en/onboarding", "/en/login", "/en/register", "/en/forgot-password", "/en/reset-password", "/en/suspended",
      ],
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
