import { getI18n } from "@/i18n";
import { AcceptInvitationForm } from "./accept-invitation-form";

export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await getI18n();
  const value = (await searchParams)?.token;
  const token = typeof value === "string" ? value : "";
  const validShape = /^[A-Za-z0-9_-]{40,64}$/.test(token);
  return validShape ? <AcceptInvitationForm token={token} locale={locale} /> : <main className="text-center"><h1 className="text-2xl font-bold">{locale === "ar" ? "رابط الدعوة غير صالح" : "Invalid invitation link"}</h1><p className="mt-3 text-sm text-muted-foreground">{locale === "ar" ? "افتح الرابط الكامل في رسالة الدعوة أو اطلب من مسؤول المطعم إعادة إرسالها." : "Open the complete link from your invitation email or ask a restaurant administrator to resend it."}</p></main>;
}
