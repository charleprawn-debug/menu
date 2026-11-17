import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getLocale } from "@/i18n";
import { getPublicSiteOrigin } from "@/lib/marketing/seo";
import { MenuView } from "./menu-view";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const origin = getPublicSiteOrigin();
  const menuPath = `/r/${encodeURIComponent(slug)}`;
  const restaurant = await db.restaurant.findFirst({
    where: { slug, deletedAt: null, status: { in: ["ACTIVE", "PENDING"] } },
    select: { name: true, description: true, seo: true, coverUrl: true },
  });
  if (!restaurant) return { title: "Menu not found" };
  const seo = (restaurant.seo ?? {}) as { title?: string; description?: string };
  return {
    title: seo.title || restaurant.name,
    description: seo.description || restaurant.description || undefined,
    alternates: origin ? {
      canonical: `${origin}/${locale}${menuPath}`,
      languages: { ar: `${origin}/ar${menuPath}`, en: `${origin}/en${menuPath}` },
    } : undefined,
    openGraph: { title: seo.title || restaurant.name, url: origin ? `${origin}/${locale}${menuPath}` : undefined, images: restaurant.coverUrl ? [restaurant.coverUrl] : undefined },
  };
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();

  const restaurant = await db.restaurant.findFirst({
    where: { slug, deletedAt: null, status: { in: ["ACTIVE", "PENDING"] } },
    include: {
      categories: {
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        include: {
          products: {
            where: { isVisible: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              descriptionAr: true,
              descriptionEn: true,
              price: true,
              compareAtPrice: true,
              imageUrl: true,
              tags: true,
              isFeatured: true,
              prepMinutes: true,
              calories: true,
              rating: true,
            },
          },
        },
      },
    },
  });

  if (!restaurant) notFound();

  const hours = (restaurant.openingHours ?? {}) as Record<string, { open: string; close: string; closed: boolean }>;
  const dayKey = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: restaurant.timezone || "Asia/Riyadh" })
    .format(new Date())
    .toLowerCase()
    .slice(0, 3);
  const today = hours[dayKey];
  let isOpen = false;
  if (today && !today.closed) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: restaurant.timezone || "Asia/Riyadh",
    }).format(now);
    const [openH, openM] = today.open.split(":").map(Number);
    const [closeH, closeM] = today.close.split(":").map(Number);
    const [nowH, nowM] = parts.split(":").map(Number);
    const minutes = nowH * 60 + nowM;
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    isOpen = closeMinutes > openMinutes ? minutes >= openMinutes && minutes < closeMinutes : minutes >= openMinutes || minutes < closeMinutes;
  }

  return (
    <MenuView
      locale={locale}
      restaurant={{
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        cuisineType: restaurant.cuisineType,
        city: restaurant.city,
        address: restaurant.address,
        phone: restaurant.phone,
        coverUrl: restaurant.coverUrl ?? "/images/food/cover.jpg",
        logoUrl: restaurant.logoUrl,
        currency: restaurant.currency,
        isOpen,
        todayHours: today ? `${today.open} – ${today.close}` : null,
        theme: (restaurant.menuTheme ?? {}) as { layout?: string; showCalories?: boolean; showAllergens?: boolean; footerText?: string },
      }}
      categories={restaurant.categories.map((category) => ({
        id: category.id,
        name: locale === "ar" ? category.nameAr : category.nameEn || category.nameAr,
        imageUrl: category.imageUrl,
        products: category.products.map((product) => ({
          id: product.id,
          name: locale === "ar" ? product.nameAr : product.nameEn || product.nameAr,
          description: locale === "ar" ? product.descriptionAr : product.descriptionEn || product.descriptionAr,
          price: Number(product.price),
          compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
          imageUrl: product.imageUrl,
          tags: product.tags,
          isFeatured: product.isFeatured,
          prepMinutes: product.prepMinutes,
          calories: product.calories,
          rating: product.rating ? Number(product.rating) : null,
        })),
      }))}
    />
  );
}
