import "server-only";
import { createAuthLink, sendAuthEmail, type AuthEmailDelivery } from "@/lib/email/smtp";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

function appLink(path: string, token: string): string | null {
  try {
    const base = new URL(process.env.NEXT_PUBLIC_APP_URL || "");
    if ((base.protocol !== "https:" && base.protocol !== "http:") || base.username || base.password || base.search || base.hash) return null;
    if (process.env.NODE_ENV === "production" && base.protocol !== "https:") return null;
    const url = new URL(path, base);
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    return null;
  }
}

async function deliver(input: { to: string; path: string; token: string; subject: string; text: string; htmlTitle: string; htmlBody: string; button: string; expiry: string }) {
  const manualUrl = appLink(input.path, input.token);
  const mailUrl = createAuthLink(input.path, input.token);
  if (!mailUrl) return { delivery: "unavailable" as const, url: manualUrl };
  const url = mailUrl.toString();
  const html = `<main style="font-family:Arial,sans-serif;line-height:1.7;max-width:600px;margin:auto"><h2>${escapeHtml(input.htmlTitle)}</h2><p>${input.htmlBody}</p><p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#059669;color:#fff;text-decoration:none;border-radius:8px">${escapeHtml(input.button)}</a></p><p>${escapeHtml(input.expiry)}</p></main>`;
  const delivery: AuthEmailDelivery = await sendAuthEmail({ to: input.to, subject: input.subject, text: `${input.text}\n${url}\n${input.expiry}`, html });
  return { delivery, url: manualUrl };
}

export async function sendStaffInvitationEmail(input: {
  email: string; token: string; restaurantName: string; roleName: string; locale: string;
}) {
  const ar = input.locale === "ar";
  const restaurant = escapeHtml(input.restaurantName);
  const role = escapeHtml(input.roleName);
  return deliver({
    to: input.email,
    path: "/accept-invitation",
    token: input.token,
    subject: ar ? `دعوة للانضمام إلى ${input.restaurantName}` : `Invitation to join ${input.restaurantName}`,
    text: ar
      ? `تمت دعوتك للانضمام إلى ${input.restaurantName} بدور ${input.roleName}. أكمل إنشاء الحساب عبر:`
      : `You were invited to join ${input.restaurantName} as ${input.roleName}. Complete your account:`,
    htmlTitle: ar ? "دعوة للانضمام" : "You are invited",
    htmlBody: `${ar ? "انضم إلى" : "Join"} <strong>${restaurant}</strong> ${ar ? "بدور" : "as"} <strong>${role}</strong>.`,
    button: ar ? "قبول الدعوة" : "Accept invitation",
    expiry: ar ? "ينتهي رابط الدعوة بعد 7 أيام." : "This invitation link expires in 7 days.",
  });
}

export async function sendEmployeeEmailChangeEmail(input: {
  email: string; token: string; restaurantName: string; locale: string;
}) {
  const ar = input.locale === "ar";
  const restaurant = escapeHtml(input.restaurantName);
  return deliver({
    to: input.email,
    path: "/confirm-email-change",
    token: input.token,
    subject: ar ? "تأكيد البريد الجديد لحساب DineFlow" : "Confirm your new DineFlow email",
    text: ar
      ? `طلب مسؤول في ${input.restaurantName} تغيير بريد دخولك. أكّد البريد الجديد هنا:`
      : `An administrator at ${input.restaurantName} requested an email change. Confirm the new address:`,
    htmlTitle: ar ? "تأكيد البريد الجديد" : "Confirm your new email",
    htmlBody: `${ar ? "طلب مسؤول في" : "An administrator at"} <strong>${restaurant}</strong> ${ar ? "تغيير بريد الدخول. أكّد ملكية هذا البريد للمتابعة." : "requested an account email change. Confirm ownership of this address to continue."}`,
    button: ar ? "تأكيد البريد" : "Confirm email",
    expiry: ar ? "ينتهي الرابط بعد ساعة ويستخدم مرة واحدة." : "This single-use link expires in one hour.",
  });
}

export async function sendStaffPasswordResetEmail(input: {
  email: string; token: string; restaurantName: string; locale: string;
}) {
  const ar = input.locale === "ar";
  const restaurant = escapeHtml(input.restaurantName);
  return deliver({
    to: input.email,
    path: "/reset-password",
    token: input.token,
    subject: ar ? "إعادة تعيين كلمة مرور حساب DineFlow" : "Reset your DineFlow password",
    text: ar
      ? `طلب مسؤول في ${input.restaurantName} إعادة تعيين كلمة مرورك. إذا كان الطلب منك، أكمل عبر:`
      : `An administrator at ${input.restaurantName} requested a password reset. If this was expected, continue here:`,
    htmlTitle: ar ? "إعادة تعيين كلمة المرور" : "Reset your password",
    htmlBody: `${ar ? "طلب مسؤول في" : "An administrator at"} <strong>${restaurant}</strong> ${ar ? "رابط إعادة تعيين كلمة مرورك. إذا لم تتوقع الطلب، تجاهل هذه الرسالة." : "a password reset link for your account. Ignore this email if you did not expect it."}`,
    button: ar ? "إعادة تعيين كلمة المرور" : "Reset password",
    expiry: ar ? "ينتهي الرابط بعد ساعة ويستخدم مرة واحدة." : "This single-use link expires in one hour.",
  });
}
