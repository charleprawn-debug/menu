import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { getI18n } from "@/i18n";
import { getLocale } from "@/i18n";
import { faqs } from "@/lib/marketing/content";
import { MarketingPageIntro, MarketingCta } from "@/components/marketing/marketing-blocks";
import { marketingMetadata } from "@/lib/marketing/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return marketingMetadata(locale, {
    ar: { title: "الأسئلة الشائعة للمطاعم", description: "إجابات عن إعداد المطعم والمنيو والطلبات والأسعار والبيانات والدعم في DineFlow." },
    en: { title: "Restaurant software FAQs", description: "Answers about restaurant setup, menus, ordering, plans, data and DineFlow support." },
  }, "/faq");
}

export default async function FAQPage() {
  const { locale } = await getI18n();
  const ar = locale === "ar";
  const categories = Array.from(new Set(faqs.map((item) => item.category.en)));
  return (
    <main>
      <MarketingPageIntro
        eyebrow={ar ? "مركز المساعدة" : "Help centre"}
        title={ar ? "أسئلة واضحة، قبل أن تبدأ." : "Clear answers before you get started."}
        description={ar ? "معلومات عن إعداد المطعم، المنيو والطلبات، الخطط، البيانات، وفريق الدعم." : "Learn about restaurant setup, menus and orders, plans, data and support."}
      />
      <div className="container max-w-4xl py-10 sm:py-14">
        <nav className="mb-8 flex flex-wrap gap-2" aria-label={ar ? "فئات الأسئلة" : "FAQ categories"}>
          {categories.map((key) => {
            const label = faqs.find((item) => item.category.en === key)!.category[locale];
            return <a key={key} href={`#faq-${encodeURIComponent(key)}`} className="rounded-full border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/30 hover:text-primary">{label}</a>;
          })}
        </nav>
        <div className="space-y-10">
          {categories.map((key) => {
            const items = faqs.filter((item) => item.category.en === key);
            const label = items[0].category[locale];
            return (
              <section key={key} id={`faq-${key}`} className="scroll-mt-24">
                <h2 className="mb-4 text-lg font-bold">{label}</h2>
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <details key={item.question.en} className="group rounded-xl border bg-card px-5 py-4 shadow-soft">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold leading-relaxed">
                        {item.question[locale]}
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{item.answer[locale]}</p>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-muted/20 p-5 sm:flex-row">
          <div><h2 className="font-semibold">{ar ? "ما لقيت جواب سؤالك؟" : "Didn't find your answer?"}</h2><p className="mt-1 text-sm text-muted-foreground">{ar ? "أرسل استفسارك وسجّل موضوع الرسالة." : "Send an enquiry and choose a topic for your message."}</p></div>
          <Link href="/contact" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">{ar ? "تواصل معنا" : "Contact us"}{ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}</Link>
        </div>
      </div>
      <MarketingCta locale={locale} title={ar ? "مستعد لاكتشاف المنصة؟" : "Ready to explore the platform?"} description={ar ? "استعرض الميزات والباقات قبل إنشاء حسابك." : "Explore features and plans before creating an account."} secondaryHref="/pricing" secondaryLabel={ar ? "عرض الأسعار" : "View pricing"} />
    </main>
  );
}
