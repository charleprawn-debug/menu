import "server-only";
import { createAuthLink, sendAuthEmail, type AuthEmailDelivery } from "@/lib/email/smtp";

export type PasswordResetDelivery = AuthEmailDelivery;

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  locale: "ar" | "en",
): Promise<PasswordResetDelivery> {
  const resetUrl = createAuthLink("/reset-password", token);
  if (!resetUrl) return "unavailable";

  const link = resetUrl.toString();
  const safeLink = link.replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
  const arabic = locale === "ar";
  return sendAuthEmail({
    to: email,
    subject: arabic ? "إعادة تعيين كلمة مرور DineFlow" : "Reset your DineFlow password",
    text: arabic
      ? `استخدم هذا الرابط الآمن لإعادة تعيين كلمة المرور. تنتهي صلاحيته بعد ساعة:\n\n${link}\n\nإذا لم تطلب ذلك، فتجاهل هذه الرسالة.`
      : `Use this secure link to reset your password. It expires in one hour:\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
    html: arabic
      ? `<div dir="rtl" lang="ar"><p>استخدم هذا الرابط الآمن لإعادة تعيين كلمة المرور. تنتهي صلاحيته بعد ساعة:</p><p><a href="${safeLink}">إعادة تعيين كلمة المرور</a></p><p>إذا لم تطلب ذلك، فتجاهل هذه الرسالة.</p></div>`
      : `<div dir="ltr" lang="en"><p>Use this secure link to reset your password. It expires in one hour:</p><p><a href="${safeLink}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
  });
}
