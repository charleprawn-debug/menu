import "server-only";
import { createAuthLink, sendAuthEmail, type AuthEmailDelivery } from "@/lib/email/smtp";

export async function sendVerificationEmail(
  email: string,
  token: string,
  locale: "ar" | "en",
): Promise<AuthEmailDelivery> {
  const verificationUrl = createAuthLink("/verify-email", token);
  if (!verificationUrl) return "unavailable";

  const link = verificationUrl.toString();
  const safeLink = link.replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
  const arabic = locale === "ar";
  return sendAuthEmail({
    to: email,
    subject: arabic ? "تأكيد بريدك الإلكتروني في DineFlow" : "Verify your DineFlow email",
    text: arabic
      ? `استخدم هذا الرابط لتأكيد بريدك الإلكتروني. تنتهي صلاحيته بعد ساعة:\n\n${link}\n\nإذا لم تنشئ حساباً، فتجاهل هذه الرسالة.`
      : `Use this link to verify your email address. It expires in one hour:\n\n${link}\n\nIf you did not create an account, you can ignore this email.`,
    html: arabic
      ? `<div dir="rtl" lang="ar"><p>استخدم هذا الرابط لتأكيد بريدك الإلكتروني. تنتهي صلاحيته بعد ساعة:</p><p><a href="${safeLink}">تأكيد البريد الإلكتروني</a></p><p>إذا لم تنشئ حساباً، فتجاهل هذه الرسالة.</p></div>`
      : `<div dir="ltr" lang="en"><p>Use this link to verify your email address. It expires in one hour:</p><p><a href="${safeLink}">Verify email</a></p><p>If you did not create an account, you can ignore this email.</p></div>`,
  });
}
