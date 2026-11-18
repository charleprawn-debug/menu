"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import type { PermissionKey } from "@/lib/permissions";
import { requireRestaurant } from "@/lib/auth/context";
import { logActivity } from "@/lib/audit";

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).optional().or(z.literal(""));
const money = z.coerce.number().finite().min(0).max(100000000);
const date = z.string().optional().or(z.literal(""));

function value(form: FormData, key: string) {
  const item = form.get(key);
  return typeof item === "string" ? item : "";
}
function bool(form: FormData, key: string) {
  return value(form, key) === "on" || value(form, key) === "true" || value(form, key) === "1";
}
function json<T>(form: FormData, key: string, fallback: T): T {
  try { return JSON.parse(value(form, key)) as T; } catch { return fallback; }
}
function listValue(form: FormData, key: string): string[] {
  const raw = value(form, key).trim();
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean); } catch { /* comma-separated fallback */ }
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}
function fail(message: string): never { throw new Error(message); }

async function tenant(permission: PermissionKey) {
  const membership = await requireRestaurant();
  if (!membership.isOwner && !membership.permissions.has(permission)) fail("FORBIDDEN");
  return membership;
}
function refresh() {
  revalidatePath("/app/menu", "layout");
  revalidatePath("/app/menu");
  revalidatePath("/r", "layout");
}

const categorySchema = z.object({
  id: z.string().optional(),
  menuId: z.string().optional(),
  nameAr: text(120).min(1),
  nameEn: optionalText(120),
  description: optionalText(1200),
  imageUrl: optionalText(1000),
  coverUrl: optionalText(1000),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  availableFrom: date,
  availableTo: date,
  isVisible: z.boolean(),
});

export async function saveCategoryAction(form: FormData) {
  const membership = await tenant("menu.categories.manage");
  const parsed = categorySchema.safeParse({
    id: value(form, "id") || undefined,
    menuId: value(form, "menuId") || undefined,
    nameAr: value(form, "nameAr"), nameEn: value(form, "nameEn"), description: value(form, "description"),
    imageUrl: value(form, "imageUrl"), coverUrl: value(form, "coverUrl"), sortOrder: value(form, "sortOrder") || 0,
    availableFrom: value(form, "availableFrom"), availableTo: value(form, "availableTo"), isVisible: bool(form, "isVisible"),
  });
  if (!parsed.success) fail("INVALID_CATEGORY");
  const data = {
    menuId: parsed.data.menuId || null,
    nameAr: parsed.data.nameAr, nameEn: parsed.data.nameEn || null, description: parsed.data.description || null,
    imageUrl: parsed.data.imageUrl || null, coverUrl: parsed.data.coverUrl || null, sortOrder: parsed.data.sortOrder,
    isVisible: parsed.data.isVisible, availableFrom: parsed.data.availableFrom ? new Date(parsed.data.availableFrom) : null,
    availableTo: parsed.data.availableTo ? new Date(parsed.data.availableTo) : null,
  };
  if (parsed.data.id) {
    const current = await db.menuCategory.findFirst({ where: { id: parsed.data.id, restaurantId: membership.restaurantId } });
    if (!current) fail("NOT_FOUND");
    await db.menuCategory.update({ where: { id: current.id }, data });
    await logActivity({ restaurantId: membership.restaurantId, actorId: membership.auth.user.id, action: "menu.category.updated", entity: "MenuCategory", entityId: current.id, oldValue: current, newValue: data });
  } else {
    const created = await db.menuCategory.create({ data: { restaurantId: membership.restaurantId, ...data } });
    await logActivity({ restaurantId: membership.restaurantId, actorId: membership.auth.user.id, action: "menu.category.created", entity: "MenuCategory", entityId: created.id, newValue: data });
  }
  refresh();
}

export async function deleteCategoryAction(form: FormData) {
  const membership = await tenant("menu.categories.manage");
  const id = value(form, "id");
  const category = await db.menuCategory.findFirst({ where: { id, restaurantId: membership.restaurantId } });
  if (!category) fail("NOT_FOUND");
  await db.$transaction([
    db.product.updateMany({ where: { restaurantId: membership.restaurantId, categoryId: id }, data: { categoryId: null } }),
    db.menuCategory.delete({ where: { id } }),
  ]);
  await logActivity({ restaurantId: membership.restaurantId, actorId: membership.auth.user.id, action: "menu.category.deleted", entity: "MenuCategory", entityId: id, oldValue: category });
  refresh();
}

export async function toggleCategoryAction(form: FormData) {
  const membership = await tenant("menu.categories.manage");
  const id = value(form, "id");
  const category = await db.menuCategory.findFirst({ where: { id, restaurantId: membership.restaurantId } });
  if (!category) fail("NOT_FOUND");
  await db.menuCategory.update({ where: { id }, data: { isVisible: !category.isVisible } });
  await logActivity({ restaurantId: membership.restaurantId, actorId: membership.auth.user.id, action: "menu.category.visibility_changed", entity: "MenuCategory", entityId: id, oldValue: { isVisible: category.isVisible }, newValue: { isVisible: !category.isVisible } });
  refresh();
}

export async function duplicateCategoryAction(form: FormData) {
  const membership = await tenant("menu.categories.manage");
  const id = value(form, "id");
  const category = await db.menuCategory.findFirst({ where: { id, restaurantId: membership.restaurantId }, include: { products: true } });
  if (!category) fail("NOT_FOUND");
  await db.$transaction(async (tx) => {
    const copy = await tx.menuCategory.create({ data: { restaurantId: membership.restaurantId, menuId: category.menuId, parentId: category.parentId, nameAr: `${category.nameAr} (نسخة)`, nameEn: category.nameEn ? `${category.nameEn} (copy)` : null, description: category.description, imageUrl: category.imageUrl, coverUrl: category.coverUrl, sortOrder: category.sortOrder + 1, isVisible: false } });
    for (const product of category.products) await tx.product.create({ data: { restaurantId: membership.restaurantId, categoryId: copy.id, nameAr: product.nameAr, nameEn: product.nameEn, descriptionAr: product.descriptionAr, descriptionEn: product.descriptionEn, sku: product.sku ? `${product.sku}-copy` : null, price: product.price, compareAtPrice: product.compareAtPrice, costPrice: product.costPrice, taxRate: product.taxRate, imageUrl: product.imageUrl, calories: product.calories, prepMinutes: product.prepMinutes, ingredients: product.ingredients, allergens: product.allergens, tags: product.tags, availability: "HIDDEN", isVisible: false, isFeatured: product.isFeatured, sortOrder: product.sortOrder } });
  });
  refresh();
}

const productSchema = z.object({
  id: z.string().optional(), categoryId: z.string().optional(), nameAr: text(140).min(1), nameEn: optionalText(140),
  descriptionAr: optionalText(2000), descriptionEn: optionalText(2000), sku: optionalText(80), price: money,
  compareAtPrice: z.coerce.number().finite().min(0).max(100000000).optional(), costPrice: z.coerce.number().finite().min(0).max(100000000).optional(),
  taxRate: z.coerce.number().finite().min(0).max(100), imageUrl: optionalText(1000), calories: z.coerce.number().int().min(0).max(100000).optional(),
  prepMinutes: z.coerce.number().int().min(0).max(1440), ingredients: optionalText(4000), allergens: z.array(z.string().trim().max(80)).max(50), tags: z.array(z.string().trim().max(80)).max(50),
  availability: z.enum(["ALWAYS", "SCHEDULED", "OUT_OF_STOCK", "HIDDEN"]), stockQty: z.coerce.number().int().min(0).max(100000000).optional(), trackStock: z.boolean(), isVisible: z.boolean(), isFeatured: z.boolean(), sortOrder: z.coerce.number().int().min(0).max(100000),
  modifierGroupIds: z.array(z.string()).max(30), extraIds: z.array(z.string()).max(50),
});

export async function saveProductAction(form: FormData) {
  const membership = await requireRestaurant();
  const id = value(form, "id") || undefined;
  if (!membership.isOwner && !membership.permissions.has(id ? "menu.products.update" : "menu.products.create")) fail("FORBIDDEN");
  const parsed = productSchema.safeParse({
    id, categoryId: value(form, "categoryId") || undefined, nameAr: value(form, "nameAr"), nameEn: value(form, "nameEn"), descriptionAr: value(form, "descriptionAr"), descriptionEn: value(form, "descriptionEn"), sku: value(form, "sku"), price: value(form, "price"), compareAtPrice: value(form, "compareAtPrice") || undefined, costPrice: value(form, "costPrice") || undefined, taxRate: value(form, "taxRate") || 0, imageUrl: value(form, "imageUrl"), calories: value(form, "calories") || undefined, prepMinutes: value(form, "prepMinutes") || 15, ingredients: value(form, "ingredients"), allergens: listValue(form, "allergens"), tags: listValue(form, "tags"), availability: value(form, "availability") || "ALWAYS", stockQty: value(form, "stockQty") || undefined, trackStock: bool(form, "trackStock"), isVisible: bool(form, "isVisible"), isFeatured: bool(form, "isFeatured"), sortOrder: value(form, "sortOrder") || 0, modifierGroupIds: json(form, "modifierGroupIds", []), extraIds: json(form, "extraIds", []),
  });
  if (!parsed.success) fail("INVALID_PRODUCT");
  if (parsed.data.categoryId) {
    const category = await db.menuCategory.findFirst({ where: { id: parsed.data.categoryId, restaurantId: membership.restaurantId } });
    if (!category) fail("INVALID_CATEGORY");
  }
  const data = { categoryId: parsed.data.categoryId || null, nameAr: parsed.data.nameAr, nameEn: parsed.data.nameEn || null, descriptionAr: parsed.data.descriptionAr || null, descriptionEn: parsed.data.descriptionEn || null, sku: parsed.data.sku || null, price: new Prisma.Decimal(parsed.data.price), compareAtPrice: parsed.data.compareAtPrice ? new Prisma.Decimal(parsed.data.compareAtPrice) : null, costPrice: parsed.data.costPrice ? new Prisma.Decimal(parsed.data.costPrice) : null, taxRate: new Prisma.Decimal(parsed.data.taxRate), imageUrl: parsed.data.imageUrl || null, calories: parsed.data.calories || null, prepMinutes: parsed.data.prepMinutes, ingredients: parsed.data.ingredients || null, allergens: parsed.data.allergens, tags: parsed.data.tags, availability: parsed.data.availability, stockQty: parsed.data.stockQty ?? null, trackStock: parsed.data.trackStock, isVisible: parsed.data.isVisible, isFeatured: parsed.data.isFeatured, sortOrder: parsed.data.sortOrder };
  await db.$transaction(async (tx) => {
    let product;
    if (id) {
      product = await tx.product.findFirst({ where: { id, restaurantId: membership.restaurantId, deletedAt: null } });
      if (!product) fail("NOT_FOUND");
      if (!product.price.equals(data.price)) await tx.priceHistory.create({ data: { productId: id, oldPrice: product.price, newPrice: data.price, changedById: membership.auth.user.id, reason: value(form, "priceReason") || "Menu product price update" } });
      await tx.product.update({ where: { id }, data });
    } else product = await tx.product.create({ data: { restaurantId: membership.restaurantId, ...data } });
    const productId = product.id;
    await tx.productModifierGroup.deleteMany({ where: { productId } });
    const groups = parsed.data.modifierGroupIds.filter(Boolean);
    if (groups.length) {
      const validGroups = await tx.modifierGroup.findMany({ where: { id: { in: groups }, restaurantId: membership.restaurantId }, select: { id: true } });
      await tx.productModifierGroup.createMany({ data: validGroups.map((g, index) => ({ productId, groupId: g.id, sortOrder: index })), skipDuplicates: true });
    }
    await tx.productExtra.deleteMany({ where: { productId } });
    const extras = parsed.data.extraIds.filter(Boolean);
    if (extras.length) {
      const validExtras = await tx.extra.findMany({ where: { id: { in: extras }, restaurantId: membership.restaurantId }, select: { id: true } });
      await tx.productExtra.createMany({ data: validExtras.map((e) => ({ productId, extraId: e.id })), skipDuplicates: true });
    }
    return product;
  });
  await logActivity({ restaurantId: membership.restaurantId, actorId: membership.auth.user.id, action: id ? "menu.product.updated" : "menu.product.created", entity: "Product", entityId: id, newValue: data });
  refresh();
}

export async function deleteProductAction(form: FormData) {
  const membership = await tenant("menu.products.delete");
  const id = value(form, "id");
  const product = await db.product.findFirst({ where: { id, restaurantId: membership.restaurantId, deletedAt: null } });
  if (!product) fail("NOT_FOUND");
  await db.product.update({ where: { id }, data: { deletedAt: new Date(), isVisible: false } });
  await logActivity({ restaurantId: membership.restaurantId, actorId: membership.auth.user.id, action: "menu.product.deleted", entity: "Product", entityId: id, oldValue: product });
  refresh();
}
export async function toggleProductAction(form: FormData) {
  const membership = await tenant("menu.products.update");
  const id = value(form, "id");
  const product = await db.product.findFirst({ where: { id, restaurantId: membership.restaurantId, deletedAt: null } });
  if (!product) fail("NOT_FOUND");
  await db.product.update({ where: { id }, data: { isVisible: !product.isVisible, availability: !product.isVisible ? "ALWAYS" : "HIDDEN" } });
  refresh();
}
export async function setProductAvailabilityAction(form: FormData) {
  const membership = await tenant("menu.products.update");
  const id = value(form, "id"); const availability = value(form, "availability");
  if (!["ALWAYS", "SCHEDULED", "OUT_OF_STOCK", "HIDDEN"].includes(availability)) fail("INVALID_AVAILABILITY");
  await db.product.updateMany({ where: { id, restaurantId: membership.restaurantId, deletedAt: null }, data: { availability: availability as "ALWAYS", isVisible: availability !== "HIDDEN" } });
  refresh();
}
export async function duplicateProductAction(form: FormData) {
  const membership = await tenant("menu.products.create");
  const id = value(form, "id"); const product = await db.product.findFirst({ where: { id, restaurantId: membership.restaurantId, deletedAt: null }, include: { modifierGroups: true, extras: true } });
  if (!product) fail("NOT_FOUND");
  await db.product.create({ data: { restaurantId: membership.restaurantId, categoryId: product.categoryId, nameAr: `${product.nameAr} (نسخة)`, nameEn: product.nameEn ? `${product.nameEn} (copy)` : null, descriptionAr: product.descriptionAr, descriptionEn: product.descriptionEn, sku: product.sku ? `${product.sku}-copy` : null, price: product.price, compareAtPrice: product.compareAtPrice, costPrice: product.costPrice, taxRate: product.taxRate, imageUrl: product.imageUrl, calories: product.calories, prepMinutes: product.prepMinutes, ingredients: product.ingredients, allergens: product.allergens, tags: product.tags, availability: "HIDDEN", isVisible: false, isFeatured: product.isFeatured, modifierGroups: { create: product.modifierGroups.map((x) => ({ groupId: x.groupId, sortOrder: x.sortOrder })) }, extras: { create: product.extras.map((x) => ({ extraId: x.extraId })) } } });
  refresh();
}

const optionSchema = z.object({ nameAr: text(120).min(1), nameEn: optionalText(120), priceDelta: money, isDefault: z.boolean(), isAvailable: z.boolean(), sortOrder: z.number().int().min(0) });
export async function saveModifierGroupAction(form: FormData) {
  const membership = await tenant("menu.modifiers.manage");
  const id = value(form, "id") || undefined;
  const options = json<unknown[]>(form, "options", []).map((item, index) => ({ ...(item as object), sortOrder: index }));
  const parsedOptions = z.array(optionSchema).max(100).safeParse(options);
  const parsed = z.object({ nameAr: text(120).min(1), nameEn: optionalText(120), description: optionalText(1000), isRequired: z.boolean(), minSelect: z.coerce.number().int().min(0).max(100), maxSelect: z.coerce.number().int().min(1).max(100), isMultiple: z.boolean(), sortOrder: z.coerce.number().int().min(0).max(100000) }).safeParse({ nameAr: value(form, "nameAr"), nameEn: value(form, "nameEn"), description: value(form, "description"), isRequired: bool(form, "isRequired"), minSelect: value(form, "minSelect") || 0, maxSelect: value(form, "maxSelect") || 1, isMultiple: bool(form, "isMultiple"), sortOrder: value(form, "sortOrder") || 0 });
  if (!parsed.success || !parsedOptions.success || parsed.data.minSelect > parsed.data.maxSelect) fail("INVALID_MODIFIER_GROUP");
  const data = { restaurantId: membership.restaurantId, nameAr: parsed.data.nameAr, nameEn: parsed.data.nameEn || null, description: parsed.data.description || null, isRequired: parsed.data.isRequired, minSelect: parsed.data.minSelect, maxSelect: parsed.data.maxSelect, isMultiple: parsed.data.isMultiple, sortOrder: parsed.data.sortOrder };
  await db.$transaction(async (tx) => {
    const group = id ? await tx.modifierGroup.updateMany({ where: { id, restaurantId: membership.restaurantId }, data }) : null;
    const groupId = id && group?.count ? id : (await tx.modifierGroup.create({ data })).id;
    await tx.modifierOption.deleteMany({ where: { groupId } });
    if (parsedOptions.data.length) await tx.modifierOption.createMany({ data: parsedOptions.data.map((o) => ({ groupId, nameAr: o.nameAr, nameEn: o.nameEn || null, priceDelta: new Prisma.Decimal(o.priceDelta), isDefault: o.isDefault, isAvailable: o.isAvailable, sortOrder: o.sortOrder })) });
  });
  refresh();
}
export async function deleteModifierGroupAction(form: FormData) { const membership = await tenant("menu.modifiers.manage"); const id=value(form,"id"); await db.modifierGroup.deleteMany({ where: { id, restaurantId: membership.restaurantId } }); refresh(); }
export async function toggleModifierOptionAction(form: FormData) { const membership=await tenant("menu.modifiers.manage"); const id=value(form,"id"); const option=await db.modifierOption.findFirst({where:{id,group:{restaurantId:membership.restaurantId}}}); if(!option) fail("NOT_FOUND"); await db.modifierOption.update({where:{id},data:{isAvailable:!option.isAvailable}}); refresh(); }

export async function saveExtraAction(form: FormData) {
  const membership = await tenant("menu.extras.manage"); const id=value(form,"id")||undefined;
  const parsed=z.object({nameAr:text(120).min(1),nameEn:optionalText(120),price:money,sortOrder:z.coerce.number().int().min(0).max(100000),isActive:z.boolean()}).safeParse({nameAr:value(form,"nameAr"),nameEn:value(form,"nameEn"),price:value(form,"price"),sortOrder:value(form,"sortOrder")||0,isActive:bool(form,"isActive")});
  if(!parsed.success) fail("INVALID_EXTRA");
  const data={restaurantId:membership.restaurantId,nameAr:parsed.data.nameAr,nameEn:parsed.data.nameEn||null,price:new Prisma.Decimal(parsed.data.price),sortOrder:parsed.data.sortOrder,isActive:parsed.data.isActive};
  if(id) await db.extra.updateMany({where:{id,restaurantId:membership.restaurantId},data}); else await db.extra.create({data}); refresh();
}
export async function deleteExtraAction(form: FormData) { const membership=await tenant("menu.extras.manage"); await db.extra.deleteMany({where:{id:value(form,"id"),restaurantId:membership.restaurantId}}); refresh(); }
export async function toggleExtraAction(form: FormData) { const membership=await tenant("menu.extras.manage"); const id=value(form,"id"); const extra=await db.extra.findFirst({where:{id,restaurantId:membership.restaurantId}}); if(!extra) fail("NOT_FOUND"); await db.extra.update({where:{id},data:{isActive:!extra.isActive}}); refresh(); }

export async function saveMenuAction(form: FormData) {
  const membership=await tenant("menu.themes.manage"); const id=value(form,"id")||undefined;
  const parsed=z.object({name:text(120).min(1),description:optionalText(1000),type:text(40),startsAt:date,endsAt:date,status:z.enum(["DRAFT","ACTIVE","ARCHIVED"]),isDefault:z.boolean()}).safeParse({name:value(form,"name"),description:value(form,"description"),type:value(form,"type")||"SEASONAL",startsAt:value(form,"startsAt"),endsAt:value(form,"endsAt"),status:value(form,"status")||"DRAFT",isDefault:bool(form,"isDefault")});
  if(!parsed.success) fail("INVALID_MENU");
  const data={name:parsed.data.name,description:parsed.data.description||null,type:parsed.data.type,status:parsed.data.status,startsAt:parsed.data.startsAt?new Date(parsed.data.startsAt):null,endsAt:parsed.data.endsAt?new Date(parsed.data.endsAt):null,isDefault:parsed.data.isDefault};
  await db.$transaction(async(tx)=>{if(data.isDefault) await tx.menu.updateMany({where:{restaurantId:membership.restaurantId},data:{isDefault:false}}); if(id){await tx.menu.updateMany({where:{id,restaurantId:membership.restaurantId},data});}else await tx.menu.create({data:{restaurantId:membership.restaurantId,...data}});}); refresh();
}
export async function duplicateMenuAction(form: FormData) { const membership=await tenant("menu.themes.manage"); const id=value(form,"id"); const menu=await db.menu.findFirst({where:{id,restaurantId:membership.restaurantId}}); if(!menu) fail("NOT_FOUND"); await db.$transaction(async(tx)=>{const copy=await tx.menu.create({data:{restaurantId:membership.restaurantId,name:`${menu.name} (نسخة)`,description:menu.description,type:menu.type,status:"DRAFT",isDefault:false}}); const cats=await tx.menuCategory.findMany({where:{restaurantId:membership.restaurantId,menuId:id},include:{products:true}}); for(const cat of cats){const c=await tx.menuCategory.create({data:{restaurantId:membership.restaurantId,menuId:copy.id,nameAr:cat.nameAr,nameEn:cat.nameEn,description:cat.description,imageUrl:cat.imageUrl,coverUrl:cat.coverUrl,sortOrder:cat.sortOrder,isVisible:false}}); for(const product of cat.products) await tx.product.create({data:{restaurantId:membership.restaurantId,categoryId:c.id,nameAr:product.nameAr,nameEn:product.nameEn,descriptionAr:product.descriptionAr,descriptionEn:product.descriptionEn,price:product.price,compareAtPrice:product.compareAtPrice,costPrice:product.costPrice,taxRate:product.taxRate,imageUrl:product.imageUrl,prepMinutes:product.prepMinutes,ingredients:product.ingredients,allergens:product.allergens,tags:product.tags,availability:"HIDDEN",isVisible:false}});}}); refresh(); }
export async function setMenuStatusAction(form: FormData) { const membership=await tenant("menu.publish"); const id=value(form,"id"); const status=value(form,"status"); if(!["DRAFT","ACTIVE","ARCHIVED"].includes(status)) fail("INVALID_STATUS"); if(status==="ACTIVE") await db.menu.updateMany({where:{restaurantId:membership.restaurantId,isDefault:true,id:{not:id}},data:{status:"ARCHIVED"}}); await db.menu.updateMany({where:{id,restaurantId:membership.restaurantId},data:{status:status as "DRAFT",isDefault:status==="ACTIVE"}}); refresh(); }

export async function saveMenuThemeAction(form: FormData) {
  const membership=await tenant("menu.themes.manage");
  const config={template:value(form,"template")||"classic",primaryColor:value(form,"primaryColor")||"#059669",secondaryColor:value(form,"secondaryColor")||"#0f172a",fontFamily:value(form,"fontFamily")||"IBM Plex Sans Arabic",layout:value(form,"layout")||"grid",cardStyle:value(form,"cardStyle")||"soft",imageSize:value(form,"imageSize")||"medium",showCover:bool(form,"showCover"),showLogo:bool(form,"showLogo"),showFooter:bool(form,"showFooter"),footerAr:value(form,"footerAr"),footerEn:value(form,"footerEn"),categoryStyle:value(form,"categoryStyle")||"pills"};
  await db.restaurant.update({where:{id:membership.restaurantId},data:{primaryColor:config.primaryColor,secondaryColor:config.secondaryColor,fontFamily:config.fontFamily,menuLayout:config.layout,menuTheme:config as Prisma.InputJsonObject}}); refresh();
}
export async function resetMenuThemeAction() { const membership=await tenant("menu.themes.manage"); await db.restaurant.update({where:{id:membership.restaurantId},data:{primaryColor:"#059669",secondaryColor:"#0f172a",fontFamily:"IBM Plex Sans Arabic",menuLayout:"grid",menuTheme:{template:"classic",primaryColor:"#059669",secondaryColor:"#0f172a",fontFamily:"IBM Plex Sans Arabic",layout:"grid",cardStyle:"soft",imageSize:"medium",showCover:true,showLogo:true,showFooter:true,categoryStyle:"pills"}}}); refresh(); }

export async function importProductsCsvAction(form: FormData) {
  const membership=await tenant("menu.import"); const raw=form.get("file"); if(!(raw instanceof File) || raw.size>5*1024*1024) fail("INVALID_FILE"); const content=await raw.text(); const lines=content.split(/\r?\n/).filter(Boolean); if(lines.length<2) fail("EMPTY_FILE"); const headers=lines[0].split(",").map(x=>x.trim().toLowerCase()); const index=(name:string)=>headers.indexOf(name); const nameIndex=index("namear"); const priceIndex=index("price"); if(nameIndex<0||priceIndex<0) fail("CSV_HEADERS_REQUIRED"); let created=0; for(const line of lines.slice(1)){const cols=line.split(","); const name=cols[nameIndex]?.trim(); const price=Number(cols[priceIndex]); if(!name||!Number.isFinite(price)||price<0) continue; await db.product.create({data:{restaurantId:membership.restaurantId,nameAr:name,nameEn:cols[index("nameen")]?.trim()||null,descriptionAr:cols[index("descriptionar")]?.trim()||null,price:new Prisma.Decimal(price),isVisible:false,availability:"HIDDEN"}}); created++;} await logActivity({restaurantId:membership.restaurantId,actorId:membership.auth.user.id,action:"menu.products.imported",entity:"Product",description:`Imported ${created} products from CSV`}); refresh();
}
