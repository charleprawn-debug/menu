import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, CircleHelp, ShieldCheck } from "lucide-react";
import { getI18n } from "@/i18n";
import { getLocale } from "@/i18n";
import { ContactForm } from "@/components/marketing/contact-form";
import { MarketingPageIntro } from "@/components/marketing/marketing-blocks";
import { marketingMetadata } from "@/lib/marketing/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return marketingMetadata(locale, {
    ar: { title: "تواصل معنا", description: "أرسل استفساراً عن عرض المنتج أو الأسعار أو احتياجات المؤسسات أو الدعم ومنصة المطاعم." },
    en: { title: "Contact sales", description: "Contact DineFlow about a demo, pricing, enterprise workflows, restaurant setup or support." },
  }, "/contact");
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const [{ locale }, params] = await Promise.all([getI18n(), searchParams]);
  const ar = locale === "ar";
  const topics = [
    { icon: Building2, title: ar ? "احتياج مؤسسي" : "Enterprise needs", body: ar ? "شارك عدد الفروع وسير العمل الذي تريد تنظيمه." : "Tell us how many locations and workflows you need to coordinate." },
    { icon: CircleHelp, title: ar ? "استفسار عن المنتج" : "Product questions", body: ar ? "اسأل عن المنيو أو الطلبات أو أدوات التشغيل." : "Ask about menus, orders or operations tools." },
    { icon: ShieldCheck, title: ar ? "خصوصية وبيانات" : "Privacy and data", body: ar ? "استخدم النموذج لطلب مراجعة استفسار متعلق بالبيانات." : "Use the form to request a review of a data-related enquiry." },
  ];
  return (
    <main>
      <MarketingPageIntro
        eyebrow={ar ? "نحن هنا للمساعدة" : "We're here to help"}
        title={ar ? "احكِ لنا ما يحتاجه مطعمك." : "Tell us what your restaurant needs."}
        description={ar ? "اختر موضوعاً وأرسل تفاصيل استفسارك. تُحفظ الرسالة في نظامنا كي يتمكن الفريق المخوّل من مراجعتها." : "Choose a topic and send the details of your enquiry. Your message is recorded in our system so the authorised team can review it."}
      />
      <section className="container grid gap-8 py-10 sm:py-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
        <aside>
          <p className="text-xs font-semibold text-primary">{ar ? "تواصل حول" : "Get in touch about"}</p>
          <h2 className="mt-2 text-2xl font-bold">{ar ? "ابدأ من هنا." : "Start here."}</h2>
          <div className="mt-6 space-y-3">
            {topics.map(({ icon: Icon, title, body }) => <article key={title} className="flex gap-3 rounded-xl border bg-card p-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p></div></article>)}
          </div>
          <div className="mt-6 rounded-xl bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
            {ar ? "تبحث عن إجابة سريعة؟ تصفح الأسئلة الشائعة أو قارن الخطط قبل إرسال استفسارك." : "Looking for a quick answer? Browse the FAQ or compare plans before sending an enquiry."}
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/faq" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">{ar ? "الأسئلة الشائعة" : "FAQ"}{ar ? <ArrowLeft className="size-3.5" /> : <ArrowRight className="size-3.5" />}</Link>
              <Link href="/pricing" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">{ar ? "الأسعار" : "Pricing"}{ar ? <ArrowLeft className="size-3.5" /> : <ArrowRight className="size-3.5" />}</Link>
            </div>
          </div>
        </aside>
        <div className="rounded-2xl border bg-card p-5 shadow-soft sm:p-8">
          <div className="mb-6"><h2 className="text-xl font-bold">{ar ? "أرسل استفسارك" : "Send an enquiry"}</h2><p className="mt-1 text-sm text-muted-foreground">{ar ? "الحقول ذات النجمة مطلوبة." : "Fields marked with an asterisk are required."}</p></div>
          <ContactForm locale={locale} initialSubject={params.subject} />
        </div>
      </section>
    </main>
  );
}
