import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { getI18n } from "@/i18n";
import { getLocale } from "@/i18n";
import { marketingFeatures } from "@/lib/marketing/content";
import { marketingMetadata } from "@/lib/marketing/seo";
import { MarketingCta } from "@/components/marketing/marketing-blocks";
import { Button } from "@/components/ui/button";

export function generateStaticParams() {
  return marketingFeatures.map((feature) => ({ slug: feature.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const feature = marketingFeatures.find((item) => item.slug === slug);
  if (!feature) return { title: "Feature not found" };
  const locale = await getLocale();
  return marketingMetadata(locale, {
    ar: { title: `${feature.title.ar} للمطاعم`, description: feature.summary.ar },
    en: { title: `${feature.title.en} for restaurants`, description: feature.summary.en },
  }, `/features/${feature.slug}`);
}

const accent: Record<string, { glow: string; icon: string; border: string }> = {
  emerald: { glow: "from-emerald-500/15", icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", border: "border-emerald-200/60 dark:border-emerald-900" },
  sky: { glow: "from-sky-500/15", icon: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", border: "border-sky-200/60 dark:border-sky-900" },
  violet: { glow: "from-violet-500/15", icon: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300", border: "border-violet-200/60 dark:border-violet-900" },
  amber: { glow: "from-amber-500/15", icon: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", border: "border-amber-200/60 dark:border-amber-900" },
  orange: { glow: "from-orange-500/15", icon: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300", border: "border-orange-200/60 dark:border-orange-900" },
  blue: { glow: "from-blue-500/15", icon: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300", border: "border-blue-200/60 dark:border-blue-900" },
  rose: { glow: "from-rose-500/15", icon: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", border: "border-rose-200/60 dark:border-rose-900" },
  teal: { glow: "from-teal-500/15", icon: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-900" },
  indigo: { glow: "from-indigo-500/15", icon: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300", border: "border-indigo-200/60 dark:border-indigo-900" },
  lime: { glow: "from-lime-500/15", icon: "bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300", border: "border-lime-200/60 dark:border-lime-900" },
};

const featureAvailability: Record<string, { ar: string; en: string }> = {
  "digital-menu": { ar: "المنيو العام متاح للتصفح فقط؛ محرر الأقسام والمنتجات ضمن خطوة 4.", en: "The public menu is available for browsing only; the category and product editor is planned for step 4." },
  "qr-ordering": { ar: "رابط المنيو للتصفح متاح؛ مولّد QR داخل التطبيق وروابط الطاولات ضمن خطوة 5، وإرسال طلبات الضيوف ضمن خطوة 11.", en: "The browse-only menu URL is available; in-app QR generation and table links are planned for step 5, and guest order submission for step 11." },
  "table-management": { ar: "إدارة الطاولات ومخطط الصالة غير متاحين بعد؛ مخططان لخطوة 5.", en: "Table management and floor-plan tools are not available yet; they are planned for step 5." },
  "order-management": { ar: "واجهة إدارة الطلبات غير متاحة بعد؛ مسار الطلب التشغيلي مخطط لخطوة 6، وطلب الضيف لخطوة 11.", en: "The order-management interface is not available yet; operational order flow is planned for step 6 and guest ordering for step 11." },
  "kitchen-display": { ar: "شاشة المطبخ التشغيلية غير متاحة بعد؛ مخططة لخطوة 7.", en: "The operational kitchen display is not available yet; it is planned for step 7." },
  "staff-management": { ar: "واجهات إدارة أعضاء الفريق غير متاحة بعد؛ مخططة لخطوة 8.", en: "Staff-management screens are not available yet; they are planned for step 8." },
  analytics: { ar: "التقارير والتحليلات التشغيلية غير متاحة بعد؛ مخططة لخطوة 9.", en: "Operational analytics and reports are not available yet; they are planned for step 9." },
  "ai-assistant": { ar: "مساعد الذكاء الاصطناعي غير متاح بعد؛ مخطط لخطوة 10.", en: "The AI assistant is not available yet; it is planned for step 10." },
  "multi-branch": { ar: "إدارة الفروع المتعددة غير متاحة في النسخة الحالية؛ تفاصيل الحدود في صفحة الأسعار لا تفعّل هذه الميزة.", en: "Multi-branch management is not available in the current release; limits shown on pricing do not activate this capability." },
  pos: { ar: "واجهة نقطة البيع غير متاحة بعد؛ مخططة لخطوة 7.", en: "The POS interface is not available yet; it is planned for step 7." },
  inventory: { ar: "إدارة المخزون غير متاحة في النسخة الحالية؛ هذه وحدة مخططة لمرحلة تشغيلية لاحقة.", en: "Inventory management is not available in the current release; it is a planned future operations module." },
};

export default async function FeatureDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = marketingFeatures.find((item) => item.slug === slug);
  if (!feature) notFound();
  const { locale } = await getI18n();
  const ar = locale === "ar";
  const Icon = feature.icon;
  const colors = accent[feature.accent];
  const related = marketingFeatures.filter((item) => item.category === feature.category && item.slug !== feature.slug).slice(0, 3);

  return (
    <main>
      <section className="relative overflow-hidden border-b bg-muted/20">
        <div className={`pointer-events-none absolute -top-24 start-1/2 size-[460px] -translate-x-1/2 rounded-full bg-gradient-to-br ${colors.glow} to-transparent blur-3xl`} />
        <div className="container relative py-12 sm:py-20">
          <Link href="/features" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary">
            {ar ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            {ar ? "كل الميزات" : "All features"}
          </Link>
          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className={`inline-flex size-14 items-center justify-center rounded-2xl ${colors.icon}`}><Icon className="size-7" /></span>
              <p className="mt-5 text-xs font-bold uppercase tracking-wider text-primary">{feature.eyebrow[locale]}</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{feature.title[locale]}</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{feature.summary[locale]}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild><Link href="/register">{ar ? "أنشئ حساباً" : "Create an account"}{ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}</Link></Button>
                <Button asChild variant="outline"><Link href="/contact?subject=demo">{ar ? "اطلب عرضاً" : "Request a demo"}</Link></Button>
                <Button asChild variant="ghost"><a href="#workflow">{ar ? "شاهد طريقة العمل" : "See how it works"}</a></Button>
              </div>
              <aside role="note" className="mt-5 rounded-xl border border-sky-200/70 bg-sky-50/70 p-4 text-sm leading-relaxed dark:border-sky-900/60 dark:bg-sky-950/20">
                <p className="font-semibold">{ar ? "حالة التوفر" : "Availability"}</p>
                <p className="mt-1 text-muted-foreground">{featureAvailability[feature.slug]?.[locale] ?? (ar ? "هذه الميزة ضمن خارطة التطوير وليست متاحة بعد." : "This capability is on the product roadmap and is not available yet.")}</p>
              </aside>
            </div>
            <div className={`rounded-3xl border ${colors.border} bg-card/85 p-6 shadow-soft backdrop-blur sm:p-8`}>
              <p className="text-xs font-bold text-primary">{ar ? "ما الذي يتغير؟" : "What changes?"}</p>
              <p className="mt-3 text-lg font-semibold leading-relaxed">{feature.description[locale]}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-primary">{ar ? "الفائدة العملية" : "Practical benefits"}</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{ar ? "مصممة لواقع المطعم اليومي." : "Designed around the restaurant's daily reality."}</h2>
            <ul className="mt-6 space-y-4">
              {feature.benefits.map((benefit) => <li key={benefit.en} className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm leading-relaxed"><span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${colors.icon}`}><Check className="size-3.5" /></span>{benefit[locale]}</li>)}
            </ul>
          </div>
          <div id="workflow" className="scroll-mt-24">
            <p className="text-xs font-semibold text-primary">{ar ? "طريقة العمل" : "How it works"}</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{ar ? "خطوات واضحة للفريق." : "Clear steps for your team."}</h2>
            <div className="mt-6 space-y-3">
              {feature.workflow.map((step, index) => (
                <article key={step.title.en} className="flex gap-4 rounded-xl border bg-card p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
                  <div><h3 className="font-semibold">{step.title[locale]}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body[locale]}</p></div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/20 py-14 sm:py-16">
        <div className="container">
          <p className="text-xs font-semibold text-primary">{ar ? "ضمن سير العمل" : "Part of the workflow"}</p>
          <h2 className="mt-2 text-2xl font-bold">{ar ? "ما الذي يمكنك إنجازه؟" : "What can your team do?"}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {feature.capabilities.map((item) => <div key={item.en} className="flex items-start gap-2.5 rounded-xl border bg-card p-4 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{item[locale]}</div>)}
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="container py-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-primary">{ar ? "قد تهمك أيضاً" : "Explore next"}</p><h2 className="mt-1 text-2xl font-bold">{ar ? "ميزات مرتبطة" : "Related features"}</h2></div><Button asChild variant="link"><Link href="/features">{ar ? "كل الميزات" : "All features"}</Link></Button></div>
          <div className="grid gap-3 md:grid-cols-3">
            {related.map((item) => { const RelatedIcon = item.icon; return <Link key={item.slug} href={`/features/${item.slug}`} className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/30"><RelatedIcon className="size-5 text-primary" /><h3 className="mt-3 font-semibold">{item.title[locale]}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary[locale]}</p></Link>; })}
          </div>
        </section>
      ) : null}
      <MarketingCta locale={locale} title={ar ? "شاهد كيف تلائم هذه الميزة مطعمك." : "See how this fits your restaurant."} description={ar ? "ابدأ بتجربة المنصة، أو أخبرنا عن سير العمل الذي تريد تحسينه." : "Start exploring the platform, or tell us which workflow you want to improve."} secondaryHref="/features" secondaryLabel={ar ? "العودة للميزات" : "Back to features"} />
    </main>
  );
}
