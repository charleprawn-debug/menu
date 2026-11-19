"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, isEmailVerificationRequired, setRestaurantCookie } from "@/lib/auth/session";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { createTranslator, getLocale } from "@/i18n";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { sendVerificationEmail } from "@/lib/email/verification";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  resetUrl?: string;
  unverified?: boolean;
}

function fieldErrorsFrom(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  const flat = error.flatten().fieldErrors;
  return Object.fromEntries(Object.entries(flat).map(([key, value]) => [key, value?.[0] ?? ""]));
}

const seededDemoAccountEmails = new Set([
  "admin@dineflow.app",
  "owner@dineflow.app",
  "manager@dineflow.app",
  "waiter@dineflow.app",
  "cashier@dineflow.app",
  "chef@dineflow.app",
  "accountant@dineflow.app",
]);

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: "تحقق من البيانات المدخلة", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const locale = await getLocale();
  const t = createTranslator(locale);
  const invalidCredentials = locale === "ar" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Incorrect email or password";
  if (process.env.NODE_ENV === "production" && seededDemoAccountEmails.has(parsed.data.email.toLowerCase())) {
    return { error: invalidCredentials };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: invalidCredentials };
  }
  if (user.status === "SUSPENDED") {
    return { error: locale === "ar" ? "هذا الحساب موقوف. تواصل مع الدعم." : "This account is suspended. Contact support." };
  }
  if (user.status === "DELETED") {
    return { error: invalidCredentials };
  }
  if (isEmailVerificationRequired() && !user.emailVerifiedAt) {
    return { error: t("auth.verify.loginRequired"), unverified: true };
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);

  const memberships = await db.restaurantMember.findMany({
    where: { userId: user.id, status: "ACTIVE", restaurant: { deletedAt: null } },
    include: { restaurant: { select: { slug: true, status: true, onboardingCompletedAt: true } } },
    orderBy: { createdAt: "asc" },
    take: 1,
  });

  if (user.platformRole || user.isPlatformAdmin) redirect("/admin");
  if (memberships.length === 0) redirect("/onboarding");

  await setRestaurantCookie(memberships[0].restaurant.slug);
  if (memberships[0].restaurant.status === "DRAFT" || !memberships[0].restaurant.onboardingCompletedAt) {
    redirect("/onboarding");
  }
  redirect("/app/dashboard");
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    terms: formData.get("terms") || undefined,
    planKey: formData.get("planKey") || undefined,
    billingCycle: formData.get("billingCycle") || undefined,
  });

  if (!parsed.success) {
    return { error: "تحقق من البيانات المدخلة", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const locale = await getLocale();
  const t = createTranslator(locale);
  const emailExists = locale === "ar" ? "هذا البريد مسجّل بالفعل" : "This email is already registered";
  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: emailExists, fieldErrors: { email: emailExists } };
  }

  if (parsed.data.planKey) {
    const selectedPlan = await db.plan.findUnique({ where: { key: parsed.data.planKey }, select: { isActive: true } });
    if (!selectedPlan?.isActive) {
      return { error: locale === "ar" ? "الباقة المختارة لم تعد متاحة. حدّث صفحة الأسعار واختر باقة أخرى." : "The selected plan is no longer available. Refresh pricing and choose another plan." };
    }
  }

  const passwordHash = await hashPassword(parsed.data.password);
  let user;
  try {
    user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        passwordHash,
        status: "ACTIVE",
        locale,
      },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: emailExists, fieldErrors: { email: emailExists } };
    }
    throw error;
  }

  if (isEmailVerificationRequired()) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    try {
      await db.emailVerificationToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const delivery = await sendVerificationEmail(user.email, token, locale);
      if (delivery !== "sent") {
        await db.$transaction(async (tx) => {
          await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });
          await tx.user.delete({ where: { id: user.id } });
        }).catch(() => null);
        return { error: t("auth.verify.registrationDeliveryError") };
      }
    } catch {
      await db.$transaction(async (tx) => {
        await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });
        await tx.user.delete({ where: { id: user.id } });
      }).catch(() => null);
      return { error: t("auth.verify.registrationDeliveryError") };
    }
    return { ok: true, message: t("auth.verify.registrationSent") };
  }

  await createSession(user.id);
  const onboardingQuery = new URLSearchParams({ cycle: parsed.data.billingCycle });
  if (parsed.data.planKey) onboardingQuery.set("plan", parsed.data.planKey);
  redirect(`/onboarding?${onboardingQuery.toString()}`);
}

export async function resendVerificationEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "بريد إلكتروني غير صالح", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const locale = await getLocale();
  const genericMessage = createTranslator(locale)("auth.verify.resendGeneric");

  try {
    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true, emailVerifiedAt: true, status: true },
    });
    if (!user || user.emailVerifiedAt || user.status !== "ACTIVE" || !isEmailVerificationRequired()) {
      return { ok: true, message: genericMessage };
    }

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const [recentCount, latest] = await Promise.all([
      db.emailVerificationToken.count({ where: { userId: user.id, createdAt: { gte: hourAgo } } }),
      db.emailVerificationToken.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);
    if (recentCount >= 5 || (latest && now.getTime() - latest.createdAt.getTime() < 60 * 1000)) {
      return { ok: true, message: genericMessage };
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await db.emailVerificationToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + 60 * 60 * 1000) },
      select: { id: true },
    });
    const delivery = await sendVerificationEmail(user.email, token, locale);
    if (delivery !== "sent") {
      // Preserve the creation timestamp for rate-limiting, but make the unsent token unusable.
      await db.emailVerificationToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    }
  } catch {
    // Keep the response indistinguishable for unknown accounts and delivery failures.
  }
  return { ok: true, message: genericMessage };
}

export async function verifyEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = await getLocale();
  const invalidMessage = createTranslator(locale)("auth.verify.invalid");
  const token = formData.get("token");
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{40,64}$/.test(token)) {
    return { error: invalidMessage };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await db.emailVerificationToken.findUnique({ where: { tokenHash } });
  const now = new Date();
  if (!record || record.usedAt || record.expiresAt.getTime() <= now.getTime()) {
    return { error: invalidMessage };
  }

  const verified = await db.$transaction(async (tx) => {
    const consumed = await tx.emailVerificationToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return false;
    const updated = await tx.user.updateMany({
      where: { id: record.userId, status: "ACTIVE", deletedAt: null },
      data: { emailVerifiedAt: now, lastLoginAt: now },
    });
    return updated.count === 1;
  });
  if (!verified) return { error: invalidMessage };

  await createSession(record.userId);
  redirect("/onboarding");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "بريد إلكتروني غير صالح", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const locale = await getLocale();
  const genericMessage = locale === "ar"
    ? "إذا كان البريد مسجّلًا، فلن يُرسل رابط الاستعادة إلا عند تهيئة خدمة البريد وعملها."
    : "If this email is registered, a reset link can be sent only when email delivery is configured and working.";
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  if (!user || user.status === "DELETED") {
    return { ok: true, message: genericMessage };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const issued = await db.$transaction(async (tx) => {
    const lockedUsers = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT "id", "status" FROM "users" WHERE "id" = ${user.id} FOR UPDATE
    `;
    if (!lockedUsers.length || lockedUsers[0].status === "DELETED") return false;
    await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await tx.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    return true;
  });
  if (!issued) return { ok: true, message: genericMessage };

  const delivery = await sendPasswordResetEmail(parsed.data.email, token, locale);
  const showLink = delivery === "unavailable" && process.env.NODE_ENV !== "production";
  if (delivery !== "sent" && !showLink) {
    await db.passwordResetToken.delete({ where: { tokenHash } }).catch(() => null);
  }

  let resetUrl: string | undefined;
  if (showLink) {
    let baseUrl: URL;
    try {
      baseUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
      if ((baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") || baseUrl.username || baseUrl.password) {
        throw new Error("Invalid app URL");
      }
    } catch {
      baseUrl = new URL("http://localhost:3000");
    }
    const url = new URL("/reset-password", baseUrl);
    url.searchParams.set("token", token);
    resetUrl = url.toString();
  }
  return { ok: true, message: genericMessage, resetUrl };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: "تحقق من البيانات المدخلة", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const locale = await getLocale();
  const invalidLink = createTranslator(locale)("auth.reset.invalid");
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return { error: invalidLink };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const now = new Date();
  const changed = await db.$transaction(async (tx) => {
    const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "users" WHERE "id" = ${record.userId} FOR UPDATE
    `;
    if (!lockedUsers.length) return false;
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return false;
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, id: { not: record.id }, usedAt: null },
      data: { usedAt: now },
    });
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    return true;
  });
  if (!changed) return { error: invalidLink };

  redirect("/login?reset=1");
}
