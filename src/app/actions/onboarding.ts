"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getActiveMembership, requireAuth } from "@/lib/auth/context";
import { setRestaurantCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/audit";

export type OnboardingResult = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  step?: number;
  destination?: string;
  mediaUrl?: string;
};

type StepResult = OnboardingResult;
export type OnboardingState = { error?: string; fieldErrors?: Record<string, string> };
const bi = (ar: string, en: string) => `${ar} / ${en}`;

const currencies = ["SAR", "AED", "USD", "EUR", "EGP", "JOD", "KWD", "QAR", "BHD", "OMR", "MAD", "TND", "DZD", "IQD", "TRY", "GBP"] as const;
const colors = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

const basicsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: optionalText(160),
  description: optionalText(1200),
  cuisineType: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(3).max(240),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(160),
  currency: z.enum(currencies),
  timezone: z.string().trim().min(3).max(80),
  locale: z.enum(["ar", "en"]),
});

const themeSchema = z.object({
  primaryColor: colors,
  secondaryColor: colors,
  fontFamily: z.enum(["IBM Plex Sans Arabic", "Cairo", "Tajawal", "Inter", "Noto Sans Arabic"]),
  menuLayout: z.enum(["grid", "list", "editorial"]),
});

const menuSchema = z.object({
  template: z.enum(["classic", "modern", "cafe", "minimal"]),
  categoryAr: z.string().trim().min(1).max(100),
  categoryEn: optionalText(100),
  productAr: z.string().trim().min(1).max(120),
  productEn: optionalText(120),
  productDescription: optionalText(500),
  price: z.coerce.number().finite().min(0).max(1000000),
});
const menuTemplatePresentation = {
  classic: { layout: "grid", footerText: { ar: "شكراً لزيارتكم", en: "Thank you for visiting" } },
  modern: { layout: "editorial", footerText: { ar: "أُعدّ بعناية لأجلكم", en: "Thoughtfully prepared for you" } },
  cafe: { layout: "list", footerText: { ar: "قهوة وحديث وطعم طيب", en: "Coffee, conversation, and something sweet" } },
  minimal: { layout: "grid", footerText: { ar: "طازج ببساطة", en: "Fresh, simply" } },
} as const;

const tablesSchema = z.object({
  count: z.coerce.number().int().min(1).max(500),
  prefix: z.string().trim().min(1).max(40),
  seats: z.coerce.number().int().min(1).max(30),
});

const serviceSchema = z.object({
  dineIn: z.boolean(),
  pickup: z.boolean(),
  delivery: z.boolean(),
  waiterCall: z.boolean(),
  paymentMethods: z.array(z.enum(["CASH", "CARD", "ONLINE", "WALLET", "BANK_TRANSFER", "PAY_AT_PICKUP", "PAY_ON_DELIVERY"])).min(1).max(7),
  openingHours: z.array(z.object({
    day: z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]),
    closed: z.boolean(),
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })).length(7),
});
const navigationSchema = z.object({
  step: z.coerce.number().int().min(1).max(6),
  intent: z.enum(["draft", "continue", "back", "return"]),
  targetStep: z.string().optional(),
});
const mediaUploadSchema = z.object({
  kind: z.enum(["logo", "cover"]),
  file: z.instanceof(File).refine((file) => file.size > 0 && file.size <= 2 * 1024 * 1024),
});

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readJson<T>(value: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed: unknown = JSON.parse(value);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

async function authorizedRestaurant() {
  const auth = await requireAuth();
  const membership = await getActiveMembership();
  if (!membership || (!membership.isOwner && !membership.permissions.has("settings.manage"))) {
    throw new Error("FORBIDDEN");
  }
  const restaurant = await db.restaurant.findFirst({
    where: { id: membership.restaurantId, deletedAt: null, members: { some: { id: membership.id, userId: auth.user.id, status: "ACTIVE" } } },
    select: { id: true, slug: true, status: true, name: true, currency: true, defaultLocale: true, settings: true, menuTheme: true, orderSettings: true, paymentSettings: true, openingHours: true },
  });
  if (!restaurant) throw new Error("RESTAURANT_NOT_FOUND");
  return { auth, membership, restaurant };
}

function failed(error: unknown): StepResult {
  if (error instanceof Error && error.message === "FORBIDDEN") return { error: bi("لا تملك صلاحية تعديل هذا المطعم.", "You do not have permission to edit this restaurant.") };
  console.error("Onboarding action failed", error);
  return { error: bi("تعذر حفظ التغييرات. حاول مرة أخرى.", "We could not save these changes. Please try again.") };
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(Object.entries(error.flatten().fieldErrors).map(([key]) => [key, bi("تحقق من هذه القيمة.", "Please check this value.")]));
}

export async function saveOnboardingStep(formData: FormData): Promise<StepResult> {
  const navigation = navigationSchema.safeParse({ step: readString(formData, "step"), intent: readString(formData, "intent"), targetStep: readString(formData, "targetStep") });
  if (!navigation.success || (navigation.data.step === 6 && navigation.data.intent === "continue")) {
    return { error: bi("خطوة الإعداد غير صالحة.", "Invalid onboarding step.") };
  }
  const { step, intent } = navigation.data;

  try {
    const { auth, membership, restaurant } = await authorizedRestaurant();
    if (restaurant.status === "ACTIVE") return { error: bi("هذا المطعم مفعّل بالفعل.", "This restaurant is already active.") };
    if (step === 1) {
      const parsed = basicsSchema.safeParse(Object.fromEntries(["name", "legalName", "description", "cuisineType", "country", "city", "address", "phone", "email", "currency", "timezone", "locale"].map((key) => [key, readString(formData, key)])));
      if (!parsed.success) return { error: bi("يرجى التحقق من معلومات المطعم المطلوبة.", "Please check the required restaurant details."), fieldErrors: fieldErrors(parsed.error) };
      await db.restaurant.updateMany({
        where: { id: restaurant.id, deletedAt: null },
        data: {
          name: parsed.data.name, legalName: parsed.data.legalName || null, description: parsed.data.description || null,
          cuisineType: parsed.data.cuisineType, country: parsed.data.country, city: parsed.data.city, address: parsed.data.address,
          phone: parsed.data.phone, email: parsed.data.email, currency: parsed.data.currency, timezone: parsed.data.timezone, defaultLocale: parsed.data.locale,
        },
      });
      await db.branch.updateMany({ where: { restaurantId: restaurant.id, isMain: true }, data: { name: parsed.data.name, city: parsed.data.city, country: parsed.data.country, address: parsed.data.address, phone: parsed.data.phone, email: parsed.data.email, currency: parsed.data.currency, timezone: parsed.data.timezone } });
    }

    if (step === 2) {
      const parsed = themeSchema.safeParse(Object.fromEntries(["primaryColor", "secondaryColor", "fontFamily", "menuLayout"].map((key) => [key, readString(formData, key)])));
      if (!parsed.success) return { error: bi("يرجى التحقق من خيارات المظهر.", "Please check the appearance options."), fieldErrors: fieldErrors(parsed.error) };
      await db.restaurant.updateMany({ where: { id: restaurant.id, deletedAt: null }, data: { ...parsed.data, menuTheme: { ...asObject(restaurant.menuTheme), ...parsed.data } as Prisma.InputJsonObject } });
    }

    if (step === 3) {
      const parsed = menuSchema.safeParse({
        template: readString(formData, "template"), categoryAr: readString(formData, "categoryAr"), categoryEn: readString(formData, "categoryEn"),
        productAr: readString(formData, "productAr"), productEn: readString(formData, "productEn"), productDescription: readString(formData, "productDescription"), price: readString(formData, "price"),
      });
      if (!parsed.success) return { error: bi("أضف تصنيفاً ومنتجاً واحداً بسعر للمتابعة.", "Add a category and one priced product to continue."), fieldErrors: fieldErrors(parsed.error) };
      await db.$transaction(async (tx) => {
        let menu = await tx.menu.findFirst({ where: { restaurantId: restaurant.id, isDefault: true }, orderBy: { createdAt: "asc" } });
        if (!menu) menu = await tx.menu.create({ data: { restaurantId: restaurant.id, name: "Main Menu", type: "MAIN", status: "DRAFT", isDefault: true } });
        await tx.menu.updateMany({ where: { id: menu.id, restaurantId: restaurant.id }, data: { status: "DRAFT" } });
        let category = await tx.menuCategory.findFirst({ where: { restaurantId: restaurant.id, menuId: menu.id }, orderBy: { sortOrder: "asc" } });
        if (category) {
          category = await tx.menuCategory.update({ where: { id: category.id }, data: { nameAr: parsed.data.categoryAr, nameEn: parsed.data.categoryEn || null, isVisible: true } });
        } else {
          category = await tx.menuCategory.create({ data: { restaurantId: restaurant.id, menuId: menu.id, nameAr: parsed.data.categoryAr, nameEn: parsed.data.categoryEn || null, isVisible: true, sortOrder: 0 } });
        }
        const existingProduct = await tx.product.findFirst({ where: { restaurantId: restaurant.id, categoryId: category.id, deletedAt: null }, orderBy: { sortOrder: "asc" } });
        if (existingProduct) {
          await tx.product.update({ where: { id: existingProduct.id }, data: { nameAr: parsed.data.productAr, nameEn: parsed.data.productEn || null, descriptionAr: parsed.data.productDescription || null, price: parsed.data.price, isVisible: true } });
        } else {
          await tx.product.create({ data: { restaurantId: restaurant.id, categoryId: category.id, nameAr: parsed.data.productAr, nameEn: parsed.data.productEn || null, descriptionAr: parsed.data.productDescription || null, price: parsed.data.price, isVisible: true } });
        }
        const presentation = menuTemplatePresentation[parsed.data.template];
        await tx.restaurant.updateMany({
          where: { id: restaurant.id },
          data: {
            settings: { ...asObject(restaurant.settings), onboardingMenuTemplate: parsed.data.template } as Prisma.InputJsonObject,
            menuLayout: presentation.layout,
            menuTheme: {
              ...asObject(restaurant.menuTheme),
              layout: presentation.layout,
              template: parsed.data.template,
              footerText: presentation.footerText[restaurant.defaultLocale === "ar" ? "ar" : "en"],
            } as Prisma.InputJsonObject,
          },
        });
      });
    }

    if (step === 4) {
      const parsed = tablesSchema.safeParse({ count: readString(formData, "count"), prefix: readString(formData, "prefix"), seats: readString(formData, "seats") });
      if (!parsed.success) return { error: bi("اختر عدداً صالحاً للطاولات ونمطاً لتسميتها.", "Please choose a valid table count and naming style."), fieldErrors: fieldErrors(parsed.error) };
      const subscription = await db.subscription.findFirst({ where: { restaurantId: restaurant.id }, include: { plan: { select: { maxTables: true } } } });
      const fallbackPlan = subscription ? null : await db.plan.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { maxTables: true } });
      const maxTables = subscription?.plan.maxTables ?? fallbackPlan?.maxTables ?? 10;
      const currentTables = await db.table.count({ where: { restaurantId: restaurant.id } });
      if (maxTables !== -1 && parsed.data.count > maxTables) {
        return { error: bi(`تسمح خطتك الحالية بحد أقصى ${maxTables} طاولة.`, `Your current plan allows up to ${maxTables} tables.`) };
      }
      if (maxTables !== -1 && currentTables > maxTables) return { error: bi("عدد طاولات المطعم يتجاوز حد الخطة الحالية بالفعل.", "This restaurant already exceeds the current plan table limit.") };
      await db.$transaction(async (tx) => {
        let area = await tx.restaurantArea.findFirst({ where: { restaurantId: restaurant.id }, orderBy: { sortOrder: "asc" } });
        if (!area) area = await tx.restaurantArea.create({ data: { restaurantId: restaurant.id, name: "Main dining room" } });
        const toCreate = Math.max(0, parsed.data.count - currentTables);
        for (let index = 0; index < toCreate; index += 1) {
          let numberIndex = currentTables + index + 1;
          let number = String(numberIndex).padStart(2, "0");
          while (await tx.table.findFirst({ where: { restaurantId: restaurant.id, number } })) {
            numberIndex += 1;
            number = String(numberIndex).padStart(2, "0");
          }
          const table = await tx.table.create({ data: { restaurantId: restaurant.id, areaId: area.id, number, name: `${parsed.data.prefix} ${number}`, seats: parsed.data.seats, allowSelfOrder: true } });
          const token = randomBytes(24).toString("base64url");
          const targetUrl = `/r/${restaurant.slug}?table=${encodeURIComponent(token)}`;
          await tx.tableQrCode.create({ data: { restaurantId: restaurant.id, tableId: table.id, code: token, type: "TABLE", label: table.name, targetUrl, isActive: true } });
        }
      });
    }

    if (step === 5) {
      const parsed = readJson(readString(formData, "settings"), serviceSchema);
      if (!parsed) return { error: bi("راجع خيارات الخدمة وطرق الدفع وساعات أيام الأسبوع السبعة.", "Please review service options, payment methods, and all seven days of opening hours.") };
      const orderSettings = { ...asObject(restaurant.orderSettings), dineIn: parsed.dineIn, pickup: parsed.pickup, delivery: parsed.delivery, waiterCall: parsed.waiterCall };
      const paymentSettings = { ...asObject(restaurant.paymentSettings), methods: parsed.paymentMethods, processingEnabled: false };
      const openingHours = Object.fromEntries(parsed.openingHours.map((item) => [item.day, item.closed ? { closed: true } : { closed: false, open: item.open, close: item.close }]));
      await db.restaurant.updateMany({ where: { id: restaurant.id, deletedAt: null }, data: { orderSettings: orderSettings as Prisma.InputJsonObject, paymentSettings: paymentSettings as Prisma.InputJsonObject, openingHours: openingHours as Prisma.InputJsonObject, settings: { ...asObject(restaurant.settings), onboardingSettingsSaved: true } as Prisma.InputJsonObject } });
    }

    const targetValue = Number(navigation.data.targetStep);
    if (intent === "return" && !z.number().int().min(1).max(6).safeParse(targetValue).success) return { error: bi("خطوة الرجوع غير صالحة.", "Invalid destination step.") };
    const nextStep = intent === "back" ? Math.max(1, step - 1) : intent === "return" ? targetValue : intent === "continue" ? Math.min(6, step + 1) : step;
    await db.restaurant.updateMany({ where: { id: restaurant.id, deletedAt: null }, data: { onboardingStep: nextStep } });
    await logActivity({ restaurantId: restaurant.id, actorId: auth.user.id, action: "restaurant.onboarding_step_saved", entity: "Restaurant", entityId: restaurant.id, description: `Onboarding step ${step} saved` });
    return { ok: true, step: nextStep };
  } catch (error) {
    return failed(error);
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

const mediaFormSchema = z.object({ kind: z.enum(["logo", "cover"]) });

function detectImage(bytes: Uint8Array): { type: "image/png" | "image/jpeg" | "image/webp"; ext: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return { type: "image/png", ext: "png" };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return { type: "image/webp", ext: "webp" };
  return null;
}

export async function uploadOnboardingMedia(formData: FormData): Promise<StepResult> {
  try {
    const { auth, restaurant } = await authorizedRestaurant();
    const parsed = mediaUploadSchema.safeParse({ kind: readString(formData, "kind"), file: formData.get("file") });
    if (!parsed.success) return { error: bi("اختر صورة PNG أو JPEG أو WebP لا يتجاوز حجمها 2 ميغابايت.", "Choose a PNG, JPEG, or WebP image no larger than 2 MB.") };
    const file = parsed.data.file;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const verified = detectImage(bytes);
    if (!verified) return { error: bi("محتوى الملف ليس صورة PNG أو JPEG أو WebP مدعومة.", "The file contents are not a supported PNG, JPEG, or WebP image.") };
    const kind = parsed.data.kind;
    const urlField = kind === "logo" ? "logoUrl" : "coverUrl";
    let created: Awaited<ReturnType<typeof db.restaurantMedia.create>> | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        created = await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`onboarding-media:${restaurant.id}`}))`;
          const currentRestaurant = await tx.restaurant.findFirst({
            where: { id: restaurant.id, deletedAt: null },
            select: { logoUrl: true, coverUrl: true },
          });
          if (!currentRestaurant) throw new Error("RESTAURANT_NOT_FOUND");
          const previousUrl = kind === "logo" ? currentRestaurant.logoUrl : currentRestaurant.coverUrl;
          const oldId = typeof previousUrl === "string" ? previousUrl.match(/^\/api\/media\/([a-zA-Z0-9_-]+)$/)?.[1] : undefined;
          const oldMedia = oldId
            ? await tx.restaurantMedia.findFirst({ where: { id: oldId, restaurantId: restaurant.id, kind }, select: { id: true } })
            : null;
          const subscription = await tx.subscription.findFirst({
            where: { restaurantId: restaurant.id, restaurant: { deletedAt: null } },
            select: { plan: { select: { storageMb: true } } },
          });
          if (!subscription) throw new Error("SUBSCRIPTION_NOT_FOUND");
          const limitMb: number | null = subscription.plan.storageMb;
          const stored = await tx.restaurantMedia.aggregate({
            where: { restaurantId: restaurant.id, ...(oldMedia ? { id: { not: oldMedia.id } } : {}) },
            _sum: { sizeBytes: true },
          });
          const currentBytes = stored._sum.sizeBytes ?? 0;
          if (limitMb !== null && limitMb !== -1 && currentBytes + bytes.length > limitMb * 1024 * 1024) {
            throw new Error("MEDIA_STORAGE_LIMIT");
          }
          const media = await tx.restaurantMedia.create({ data: { restaurantId: restaurant.id, kind, contentType: verified.type, data: Buffer.from(bytes), sizeBytes: bytes.length, isPublic: true } });
          await tx.restaurant.updateMany({ where: { id: restaurant.id, deletedAt: null }, data: { [urlField]: `/api/media/${media.id}` } });
          if (oldMedia) await tx.restaurantMedia.deleteMany({ where: { id: oldMedia.id, restaurantId: restaurant.id, kind } });
          return media;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        break;
      } catch (error) {
        const retryableConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (retryableConflict && attempt < 2) continue;
        throw error;
      }
    }
    if (!created) throw new Error("MEDIA_UPLOAD_RETRIES_EXHAUSTED");
    await logActivity({ restaurantId: restaurant.id, actorId: auth.user.id, action: "restaurant.onboarding_media_uploaded", entity: "RestaurantMedia", entityId: created.id, description: `${kind} uploaded` });
    return { ok: true, mediaUrl: `/api/media/${created.id}` };
  } catch (error) {
    if (error instanceof Error && error.message === "MEDIA_STORAGE_LIMIT") {
      return { error: bi("تجاوز الرفع حد التخزين الإجمالي لوسائط خطة المطعم.", "This upload would exceed your restaurant plan's total media-storage limit.") };
    }
    if (error instanceof Error && error.message === "SUBSCRIPTION_NOT_FOUND") {
      return { error: bi("تعذر تحديد خطة التخزين الحالية للمطعم.", "The restaurant's current storage plan could not be determined.") };
    }
    return failed(error);
  }
}

export async function removeOnboardingMedia(formData: FormData): Promise<StepResult> {
  try {
    const { auth, restaurant } = await authorizedRestaurant();
    const parsed = mediaFormSchema.safeParse({ kind: readString(formData, "kind") });
    if (!parsed.success) return { error: bi("نوع الصورة غير صالح.", "Invalid media type.") };
    const kind = parsed.data.kind;
    const urlField = kind === "logo" ? "logoUrl" : "coverUrl";
    await db.$transaction(async (tx) => {
      const url = kind === "logo"
        ? (await tx.restaurant.findFirst({ where: { id: restaurant.id, deletedAt: null }, select: { logoUrl: true } }))?.logoUrl
        : (await tx.restaurant.findFirst({ where: { id: restaurant.id, deletedAt: null }, select: { coverUrl: true } }))?.coverUrl;
      const mediaId = url?.match(/^\/api\/media\/([a-zA-Z0-9_-]+)$/)?.[1];
      await tx.restaurant.updateMany({ where: { id: restaurant.id, deletedAt: null }, data: { [urlField]: null } });
      if (mediaId) await tx.restaurantMedia.deleteMany({ where: { id: mediaId, restaurantId: restaurant.id, kind } });
    });
    await logActivity({ restaurantId: restaurant.id, actorId: auth.user.id, action: "restaurant.onboarding_media_removed", entity: "Restaurant", entityId: restaurant.id, description: `${kind} removed` });
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

const launchSchema = z.object({ confirmation: z.literal("launch") });

export async function launchOnboardingRestaurant(formData: FormData): Promise<StepResult> {
  try {
    const { auth, membership, restaurant } = await authorizedRestaurant();
    if (!launchSchema.safeParse({ confirmation: readString(formData, "confirmation") }).success) return { error: bi("طلب الإطلاق غير صالح.", "Invalid launch request.") };
    const full = await db.restaurant.findFirst({ where: { id: restaurant.id, deletedAt: null }, select: { id: true, name: true, cuisineType: true, country: true, city: true, address: true, phone: true, email: true, currency: true, timezone: true, defaultLocale: true, logoUrl: true, orderSettings: true, paymentSettings: true, openingHours: true } });
    if (!full) return { error: bi("لم يتم العثور على المطعم.", "Restaurant not found.") };
    const mediaId = full.logoUrl?.match(/^\/api\/media\/([a-zA-Z0-9_-]+)$/)?.[1];
    const logo = mediaId ? await db.restaurantMedia.findFirst({ where: { id: mediaId, restaurantId: restaurant.id, kind: "logo", isPublic: true }, select: { id: true } }) : null;
    const menu = await db.menu.findFirst({ where: { restaurantId: restaurant.id, isDefault: true }, select: { id: true } });
    const category = menu ? await db.menuCategory.findFirst({ where: { restaurantId: restaurant.id, menuId: menu.id, isVisible: true, products: { some: { restaurantId: restaurant.id, deletedAt: null, isVisible: true } } }, select: { id: true, products: { where: { restaurantId: restaurant.id, deletedAt: null, isVisible: true }, select: { id: true }, take: 1 } } }) : null;
    const table = await db.table.findFirst({ where: { restaurantId: restaurant.id, isActive: true, qrCodes: { some: { restaurantId: restaurant.id, isActive: true } } }, select: { id: true } });
    const order = asObject(full.orderSettings);
    const payment = asObject(full.paymentSettings);
    const hours = asObject(full.openingHours);
    const settingsOk = ["dineIn", "pickup", "delivery", "waiterCall"].every((key) => typeof order[key] === "boolean") && Array.isArray(payment.methods) && payment.methods.length > 0 && ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].every((day) => {
      const value = hours[day];
      return Boolean(value && typeof value === "object" && typeof (value as Record<string, unknown>).closed === "boolean" && ((value as Record<string, unknown>).closed === true || (typeof (value as Record<string, unknown>).open === "string" && typeof (value as Record<string, unknown>).close === "string")));
    });
    const checks = {
      basics: Boolean(full.name.trim() && full.cuisineType && full.country && full.city && full.address && full.phone && full.email && full.currency && full.timezone && full.defaultLocale),
      logo: Boolean(logo),
      menu: Boolean(menu && category && category.products.length > 0),
      table: Boolean(table),
      settings: settingsOk,
    };
    if (Object.values(checks).some((ready) => !ready)) return { error: bi("أكمل عناصر القائمة قبل الإطلاق: المعلومات الأساسية، الشعار، تصنيف ظاهر ومنتج بسعر، رمز QR للطاولة، وإعدادات التشغيل.", "Finish every checklist item before launching: restaurant basics, logo, visible category and priced product, table QR, and service settings.") };
    await db.$transaction(async (tx) => {
      await tx.menu.updateMany({ where: { restaurantId: restaurant.id, isDefault: true }, data: { status: "ACTIVE" } });
      await tx.restaurant.updateMany({ where: { id: restaurant.id, deletedAt: null }, data: { status: "ACTIVE", onboardingStep: 6, onboardingCompletedAt: new Date() } });
    });
    await setRestaurantCookie(membership.restaurant.slug);
    await logActivity({ restaurantId: restaurant.id, actorId: auth.user.id, action: "restaurant.launch", entity: "Restaurant", entityId: restaurant.id, description: "Restaurant launched after onboarding checklist completed" });
    return { ok: true, destination: "/app/dashboard", step: 6 };
  } catch (error) {
    return failed(error);
  }
}

/** Kept for compatibility with the previous setup form while it is no longer rendered. */
export async function saveRestaurantBasics(_previous: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const schema = z.object({ name: z.string().trim().min(2).max(120), cuisineType: z.string().trim().max(80), city: z.string().trim().max(80), phone: z.string().trim().max(30), currency: z.enum(currencies), timezone: z.string().trim().max(80) });
  const parsed = schema.safeParse(Object.fromEntries(["name", "cuisineType", "city", "phone", "currency", "timezone"].map((key) => [key, readString(formData, key)])));
  if (!parsed.success) return { error: bi("يرجى التحقق من معلومات المطعم.", "Please check the restaurant details."), fieldErrors: fieldErrors(parsed.error) };
  try {
    const { auth, restaurant } = await authorizedRestaurant();
    await db.restaurant.updateMany({ where: { id: restaurant.id, deletedAt: null }, data: { name: parsed.data.name, cuisineType: parsed.data.cuisineType || null, city: parsed.data.city || null, phone: parsed.data.phone || null, currency: parsed.data.currency, timezone: parsed.data.timezone || "Asia/Riyadh", onboardingStep: 2 } });
    await logActivity({ restaurantId: restaurant.id, actorId: auth.user.id, action: "restaurant.onboarding_step_saved", entity: "Restaurant", entityId: restaurant.id, description: "Legacy onboarding basics saved" });
    return {};
  } catch (error) {
    return failed(error);
  }
}
