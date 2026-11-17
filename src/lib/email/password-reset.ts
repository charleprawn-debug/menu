import "server-only";
import nodemailer from "nodemailer";

export type PasswordResetDelivery = "sent" | "unavailable" | "failed";

function getMailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !from || !appUrl) {
    return null;
  }

  let resetBase: URL;
  try {
    resetBase = new URL(appUrl);
  } catch {
    return null;
  }
  if (
    (resetBase.protocol !== "https:" && resetBase.protocol !== "http:") ||
    resetBase.username ||
    resetBase.password ||
    (process.env.NODE_ENV === "production" && resetBase.protocol !== "https:")
  ) {
    return null;
  }

  const resetUrl = new URL("/reset-password", resetBase);
  return { host, port, user, password, from, resetUrl };
}

export async function sendPasswordResetEmail(email: string, token: string, locale: "ar" | "en"): Promise<PasswordResetDelivery> {
  const config = getMailConfig();
  if (!config) return "unavailable";

  config.resetUrl.searchParams.set("token", token);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    tls: { minVersion: "TLSv1.2" },
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    const arabic = locale === "ar";
    const resetLink = config.resetUrl.toString();
    const safeResetLink = resetLink.replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
    const result = await transporter.sendMail({
      from: config.from,
      to: email,
      subject: arabic ? "إعادة تعيين كلمة مرور DineFlow" : "Reset your DineFlow password",
      text: arabic
        ? `استخدم هذا الرابط الآمن لإعادة تعيين كلمة المرور. تنتهي صلاحيته بعد ساعة:\n\n${resetLink}\n\nإذا لم تطلب ذلك، فتجاهل هذه الرسالة.`
        : `Use this secure link to reset your password. It expires in one hour:\n\n${resetLink}\n\nIf you did not request this, you can ignore this email.`,
      html: arabic
        ? `<div dir="rtl" lang="ar"><p>استخدم هذا الرابط الآمن لإعادة تعيين كلمة المرور. تنتهي صلاحيته بعد ساعة:</p><p><a href="${safeResetLink}">إعادة تعيين كلمة المرور</a></p><p>إذا لم تطلب ذلك، فتجاهل هذه الرسالة.</p></div>`
        : `<div dir="ltr" lang="en"><p>Use this secure link to reset your password. It expires in one hour:</p><p><a href="${safeResetLink}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
    });
    return result.accepted.length > 0 ? "sent" : "failed";
  } catch {
    // Never include message content, recipient details, or reset tokens in server logs.
    console.error("[auth] password reset email delivery failed");
    return "failed";
  } finally {
    transporter.close();
  }
}
