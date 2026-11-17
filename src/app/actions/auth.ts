"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, setRestaurantCookie } from "@/lib/auth/session";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { getLocale } from "@/i18n";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  resetUrl?: string;
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

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);

  const memberships = await db.restaurantMember.findMany({
    where: { userId: user.id, status: "ACTIVE", restaurant: { deletedAt: null } },
    include: { restaurant: { select: { slug: true, status: true, onboardingCompletedAt: true } } },
    orderBy: { createdAt: "asc" },
    take: 1,
  });

  if (user.isPlatformAdmin) redirect("/admin");
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

  await createSession(user.id);
  const onboardingQuery = new URLSearchParams({ cycle: parsed.data.billingCycle });
  if (parsed.data.planKey) onboardingQuery.set("plan", parsed.data.planKey);
  redirect(`/onboarding?${onboardingQuery.toString()}`);
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

  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });

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

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return { error: "رابط الاستعادة غير صالح أو منتهي." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  redirect("/login?reset=1");
}
