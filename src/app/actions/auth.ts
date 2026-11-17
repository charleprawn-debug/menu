"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, setRestaurantCookie } from "@/lib/auth/session";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validations/auth";

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

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: "تحقق من البيانات المدخلة", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  }
  if (user.status === "SUSPENDED") {
    return { error: "هذا الحساب موقوف. تواصل مع الدعم." };
  }
  if (user.status === "DELETED") {
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);

  const memberships = await db.restaurantMember.findMany({
    where: { userId: user.id, status: "ACTIVE", restaurant: { deletedAt: null } },
    include: { restaurant: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
    take: 1,
  });

  if (user.isPlatformAdmin) redirect("/admin");
  if (memberships.length === 0) redirect("/onboarding");

  await setRestaurantCookie(memberships[0].restaurant.slug);
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
  });

  if (!parsed.success) {
    return { error: "تحقق من البيانات المدخلة", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "هذا البريد مسجّل بالفعل", fieldErrors: { email: "هذا البريد مسجّل بالفعل" } };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      passwordHash,
      status: "ACTIVE",
      locale: "ar",
    },
  });

  await createSession(user.id);
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

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const genericMessage = "إذا كان البريد مسجلاً، فقد تم إرسال رابط الاستعادة.";

  if (!user || user.status === "DELETED") {
    return { ok: true, message: genericMessage };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${base}/reset-password?token=${token}`;

  // Without SMTP configured we surface the link in non-production so the flow stays testable.
  const showLink = process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST;

  console.info(`[auth] password reset link for ${user.email}: ${resetUrl}`);

  return { ok: true, message: genericMessage, resetUrl: showLink ? resetUrl : undefined };
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
