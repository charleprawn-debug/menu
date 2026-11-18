import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";

function csv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const membership = await requireRestaurant("menu.view");
  const type = new URL(request.url).searchParams.get("type") || "products";
  if (type !== "products" && !membership.isOwner && !membership.permissions.has("menu.categories.manage")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const products = await db.product.findMany({ where: { restaurantId: membership.restaurantId, deletedAt: null }, include: { category: { select: { nameAr: true, nameEn: true } }, modifierGroups: { include: { group: { select: { nameAr: true, nameEn: true } } } }, extras: { include: { extra: { select: { nameAr: true, nameEn: true } } } } }, orderBy: { sortOrder: "asc" } });
  const header = ["id", "nameAr", "nameEn", "descriptionAr", "descriptionEn", "categoryAr", "categoryEn", "price", "compareAtPrice", "costPrice", "taxRate", "availability", "isVisible", "isFeatured", "prepMinutes", "stockQty", "allergens", "tags", "modifierGroups", "extras"].join(",");
  const rows = products.map((p) => [p.id, p.nameAr, p.nameEn, p.descriptionAr, p.descriptionEn, p.category?.nameAr, p.category?.nameEn, p.price, p.compareAtPrice, p.costPrice, p.taxRate, p.availability, p.isVisible, p.isFeatured, p.prepMinutes, p.stockQty, p.allergens.join(" | "), p.tags.join(" | "), p.modifierGroups.map((x) => x.group.nameAr).join(" | "), p.extras.map((x) => x.extra.nameAr).join(" | ")].map(csv).join(","));
  return new NextResponse([header, ...rows].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="menu-products-${membership.restaurantId}.csv"`, "Cache-Control": "no-store" } });
}
