import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/session";
import { ensureDraftRestaurant } from "@/lib/services/restaurant";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { OnboardingWizard, type WizardInitialData } from "./onboarding-wizard";

export const metadata: Metadata = { title: "DineFlow · Restaurant setup" };

type SearchParams = Promise<{ plan?: string | string[]; cycle?: string | string[]; step?: string | string[] }>;
const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const boolValue = (value: unknown, fallback: boolean) => typeof value === "boolean" ? value : fallback;

export default async function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  const [auth, i18n, query] = await Promise.all([getAuth(), getI18n(), searchParams]);
  if (!auth) redirect("/login");
  if (auth.user.isPlatformAdmin) redirect("/admin");
  const planKey = first(query.plan);
  const cycleParam = first(query.cycle)?.toUpperCase();
  const billingCycle = cycleParam === "YEARLY" || cycleParam === "ANNUAL" ? "YEARLY" : cycleParam === "MONTHLY" ? "MONTHLY" : undefined;
  const restaurant = await ensureDraftRestaurant(auth.user.id, {
    ...(planKey ? { planKey } : {}),
    ...(billingCycle ? { billingCycle } : {}),
  });
  if (restaurant.onboardingCompletedAt && restaurant.status === "ACTIVE") redirect("/app/dashboard");

  const [menu, tables, media, subscription, fallbackPlan] = await Promise.all([
    db.menu.findFirst({
      where: { restaurantId: restaurant.id, isDefault: true },
      orderBy: { createdAt: "asc" },
    }),
    db.table.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "asc" },
      include: { qrCodes: { where: { restaurantId: restaurant.id, isActive: true }, select: { code: true, targetUrl: true } } },
    }),
    db.restaurantMedia.findMany({ where: { restaurantId: restaurant.id, isPublic: true }, select: { id: true, kind: true } }),
    db.subscription.findFirst({ where: { restaurantId: restaurant.id }, include: { plan: { select: { maxTables: true } } } }),
    db.plan.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { maxTables: true } }),
  ]);
  const categories = menu ? await db.menuCategory.findMany({
    where: { restaurantId: restaurant.id, menuId: menu.id, isVisible: true },
    orderBy: { sortOrder: "asc" },
    include: { products: { where: { restaurantId: restaurant.id, deletedAt: null, isVisible: true }, orderBy: { sortOrder: "asc" } } },
  }) : [];
  const settings = object(restaurant.settings);
  const orderSettings = object(restaurant.orderSettings);
  const paymentSettings = object(restaurant.paymentSettings);
  const openingHours = object(restaurant.openingHours);
  const maxTables = subscription?.plan.maxTables ?? fallbackPlan?.maxTables ?? 10;
  const category = categories[0];
  const product = category?.products[0];
  const week = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const initial: WizardInitialData = {
    restaurantId: restaurant.id,
    slug: restaurant.slug,
    step: Math.min(6, Math.max(1, Number(first(query.step)) || restaurant.onboardingStep || 1)),
    basics: {
      name: restaurant.name ?? "",
      legalName: restaurant.legalName ?? "",
      description: restaurant.description ?? "",
      cuisineType: restaurant.cuisineType ?? "",
      country: restaurant.country ?? "",
      city: restaurant.city ?? "",
      address: restaurant.address ?? "",
      phone: restaurant.phone ?? "",
      email: restaurant.email ?? "",
      currency: restaurant.currency ?? "SAR",
      timezone: restaurant.timezone ?? "Asia/Riyadh",
      locale: restaurant.defaultLocale ?? i18n.locale,
    },
    theme: {
      primaryColor: restaurant.primaryColor ?? "#059669",
      secondaryColor: restaurant.secondaryColor ?? "#0f172a",
      fontFamily: restaurant.fontFamily ?? "IBM Plex Sans Arabic",
      menuLayout: restaurant.menuLayout ?? "grid",
    },
    logoUrl: restaurant.logoUrl,
    coverUrl: restaurant.coverUrl,
    hasLogo: media.some((asset) => asset.kind === "logo" && restaurant.logoUrl === `/api/media/${asset.id}`),
    template: typeof settings.onboardingMenuTemplate === "string" ? settings.onboardingMenuTemplate : "classic",
    categoryAr: category?.nameAr ?? "المقبلات",
    categoryEn: category?.nameEn ?? "Starters",
    productAr: product?.nameAr ?? "حمص بالطحينة",
    productEn: product?.nameEn ?? "Classic hummus",
    productDescription: product?.descriptionAr ?? "",
    price: product ? String(product.price) : "18",
    tableCount: Math.max(tables.length, maxTables === -1 ? 5 : Math.min(5, Math.max(1, maxTables))),
    tablePrefix: tables[0]?.name?.replace(/\s*\d+$/, "").trim() || (i18n.locale === "ar" ? "طاولة" : "Table"),
    seats: tables[0]?.seats ?? 2,
    tables: tables.map((table) => ({ id: table.id, name: table.name || table.number, number: table.number, token: table.qrCodes[0]?.code ?? "", url: table.qrCodes[0]?.targetUrl ?? `/r/${restaurant.slug}` })),
    services: {
      dineIn: boolValue(orderSettings.dineIn, true),
      pickup: boolValue(orderSettings.pickup, true),
      delivery: boolValue(orderSettings.delivery, false),
      waiterCall: boolValue(orderSettings.waiterCall, true),
      paymentMethods: Array.isArray(paymentSettings.methods) ? paymentSettings.methods.filter((value): value is string => typeof value === "string") : ["CASH"],
      openingHours: week.map((day) => {
        const value = object(openingHours[day]);
        return { day, closed: boolValue(value.closed, day === "fri"), open: typeof value.open === "string" ? value.open : "09:00", close: typeof value.close === "string" ? value.close : "21:00" };
      }),
    },
    maxTables,
  };
  const checklist = {
    basics: Boolean(initial.basics.name && initial.basics.cuisineType && initial.basics.country && initial.basics.city && initial.basics.address && initial.basics.phone && initial.basics.email && initial.basics.currency && initial.basics.timezone && initial.basics.locale),
    logo: initial.hasLogo,
    menu: Boolean(category && product),
    table: tables.some((table) => table.qrCodes.length > 0),
    settings: ["dineIn", "pickup", "delivery", "waiterCall"].every((key) => typeof orderSettings[key] === "boolean") && Array.isArray(paymentSettings.methods) && week.every((day) => typeof openingHours[day] === "object"),
  };

  return (
    <div className="min-h-screen bg-background" dir={i18n.dir}>
      <header className="flex h-16 items-center justify-between border-b bg-card/70 px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">{i18n.locale === "ar" ? "مسودة آمنة · يمكنك المتابعة لاحقاً" : "Secure draft · you can continue later"}</span>
          <LocaleSwitcher compact />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <OnboardingWizard locale={i18n.locale} dir={i18n.dir} initial={initial} initialChecklist={checklist} />
      </main>
    </div>
  );
}
