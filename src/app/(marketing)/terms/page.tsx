import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { getLocale } from "@/i18n";
import { LegalDocument } from "@/components/marketing/legal-document";
import { termsSections } from "@/lib/marketing/legal-content";
import { marketingMetadata } from "@/lib/marketing/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return marketingMetadata(locale, {
    ar: { title: "شروط الاستخدام", description: "الشروط المنظمة للحسابات والاشتراكات ومحتوى المطعم والاستخدام المقبول والمسؤوليات." },
    en: { title: "Terms of use", description: "Terms covering accounts, subscriptions, restaurant content, acceptable use and responsibilities." },
  }, "/terms");
}

export default async function TermsPage() {
  const { locale } = await getI18n();
  const ar = locale === "ar";
  return <LegalDocument locale={locale} title={ar ? "شروط الاستخدام" : "Terms of Service"} description={ar ? "القواعد الأساسية لاستخدام منصة DineFlow وحسابات المطاعم." : "The core rules for using DineFlow and restaurant accounts."} sections={termsSections} />;
}
