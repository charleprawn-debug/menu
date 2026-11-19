import { getI18n } from "@/i18n";
import { ConfirmEmailChangeForm } from "./confirm-email-change-form";

export const dynamic = "force-dynamic";

export default async function ConfirmEmailChangePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await getI18n();
  const value = (await searchParams)?.token;
  const token = typeof value === "string" ? value : "";
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return <main className="text-center"><h1 className="text-2xl font-bold">{locale === "ar" ? "رابط التأكيد غير صالح" : "Invalid confirmation link"}</h1><p className="mt-3 text-sm text-muted-foreground">{locale === "ar" ? "اطلب من مسؤول المطعم إعادة طلب تغيير البريد." : "Ask the restaurant administrator to request the email change again."}</p></main>;
  return <ConfirmEmailChangeForm token={token} locale={locale} />;
}
