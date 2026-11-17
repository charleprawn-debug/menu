import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { getLocale } from "@/i18n";
import { LegalDocument } from "@/components/marketing/legal-document";
import { privacySections } from "@/lib/marketing/legal-content";
import { marketingMetadata } from "@/lib/marketing/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return marketingMetadata(locale, {
    ar: { title: "سياسة الخصوصية", description: "تعرف على كيفية معالجة معلومات الحساب والمنيو والطلبات والدعم والبيانات التقنية وحفظها." },
    en: { title: "Privacy policy", description: "Learn how restaurant account, menu, order, support and technical information is handled and retained." },
  }, "/privacy");
}

export default async function PrivacyPage() {
  const { locale } = await getI18n();
  const ar = locale === "ar";
  return <LegalDocument locale={locale} title={ar ? "سياسة الخصوصية" : "Privacy Policy"} description={ar ? "ما المعلومات التي تعالجها المنصة، ولماذا، وكيف يمكن طلب مراجعتها." : "What information the platform processes, why it is used and how to request a review."} sections={privacySections} />;
}
