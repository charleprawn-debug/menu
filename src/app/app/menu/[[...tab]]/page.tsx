import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { getI18n } from "@/i18n";
import { MenuWorkspace } from "@/components/menu/menu-workspace";

export const metadata: Metadata = { title: "إدارة المنيو | DineFlow" };

export default async function MenuPage({ params }: { params: Promise<{ tab?: string[] }> }) {
  const { tab } = await params;
  const membership = await requireRestaurant("menu.view");
  const { locale } = await getI18n();
  const restaurantId = membership.restaurantId;
  const activeTab = tab?.[0] ?? "overview";

  const [categories, products, groups, extras, menus, restaurant] = await Promise.all([
    db.menuCategory.findMany({ where: { restaurantId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { products: true } } } }),
    db.product.findMany({ where: { restaurantId, deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], include: { category: { select: { nameAr: true, nameEn: true } }, modifierGroups: { include: { group: { include: { options: true } } } }, extras: { include: { extra: true } } } }),
    db.modifierGroup.findMany({ where: { restaurantId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { options: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } } }),
    db.extra.findMany({ where: { restaurantId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { products: true } } } }),
    db.menu.findMany({ where: { restaurantId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], include: { _count: { select: { schedules: true } } } }),
    db.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true, name: true, currency: true, menuTheme: true, primaryColor: true, secondaryColor: true, fontFamily: true, menuLayout: true } }),
  ]);
  if (!restaurant) return null;

  const serializedCategories = categories.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }));
  const serializedProducts = products.map((item) => ({
    ...item,
    price: item.price.toString(),
    compareAtPrice: item.compareAtPrice?.toString() ?? null,
    costPrice: item.costPrice?.toString() ?? null,
    taxRate: item.taxRate.toString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    deletedAt: null,
    modifierGroups: item.modifierGroups.map((link) => ({
      groupId: link.groupId,
      group: {
        ...link.group,
        createdAt: link.group.createdAt.toISOString(),
        updatedAt: link.group.updatedAt.toISOString(),
        options: link.group.options.map((option) => ({ ...option, priceDelta: option.priceDelta.toString() })),
      },
    })),
    extras: item.extras.map((link) => ({
      extraId: link.extraId,
      extra: { ...link.extra, price: link.extra.price.toString(), createdAt: link.extra.createdAt.toISOString() },
    })),
  }));
  const serializedGroups = groups.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    options: item.options.map((option) => ({ ...option, priceDelta: option.priceDelta.toString() })),
  }));
  const serializedExtras = extras.map((item) => ({ ...item, price: item.price.toString(), createdAt: item.createdAt.toISOString() }));
  const serializedMenus = menus.map((item) => ({ ...item, startsAt: item.startsAt?.toISOString() ?? null, endsAt: item.endsAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }));

  return <MenuWorkspace locale={locale} activeTab={activeTab} permissions={[...membership.permissions]} isOwner={membership.isOwner} restaurant={restaurant} categories={serializedCategories} products={serializedProducts} groups={serializedGroups} extras={serializedExtras} menus={serializedMenus} />;
}
