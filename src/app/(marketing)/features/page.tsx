import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getI18n } from "@/i18n";
import { getLocale } from "@/i18n";
import { marketingFeatures } from "@/lib/marketing/content";
import { marketingMetadata } from "@/lib/marketing/seo";
import { MarketingPageIntro, MarketingCta } from "@/components/marketing/marketing-blocks";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return marketingMetadata(locale, {
    ar: { title: "ميزات المطاعم", description: "اكتشف المنيو الرقمي ووصول الضيوف عبر QR وإدارة الطاولات والمطبخ والموظفين والتحليلات والمخزون." },
    en: { title: "Restaurant features", description: "Explore digital menus, QR menu access, table management, kitchen workflows, staff, analytics, POS and inventory." },
  }, "/features");
}

const groups = {
  guest: { ar: "تجربة الضيف", en: "Guest experience" },
  operations: { ar: "التشغيل اليومي", en: "Daily operations" },
  insights: { ar: "الرؤية والتحليل", en: "Insights" },
} as const;

const iconTone: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  lime: "bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300",
};

export default async function FeaturesPage() {
  const { locale } = await getI18n();
  const ar = locale === "ar";
  return (
    <main>
      <MarketingPageIntro
        eyebrow={ar ? "منصة تشغيل متكاملة" : "One connected platform"}
        title={ar ? "كل أدوات المطعم، تعمل معاً." : "Restaurant tools that work together."}
        description={ar ? "من أول نظرة على المنيو حتى الطلب والتحضير وقراءة الأداء—اكتشف كيف يجمع DineFlow أعمال المطعم اليومية في تجربة واحدة." : "From the menu a guest sees to the order, preparation and performance review—discover how DineFlow connects everyday restaurant work."}
      />
      <section className="container py-8">
        <p className="mb-4 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {ar ? "تختلف إتاحة الميزات وحدودها بحسب الباقة وإعدادات الحساب ومرحلة الإطلاق." : "Feature availability and limits depend on the selected plan, account configuration and rollout stage."}
        </p>
        <nav className="mb-8 flex flex-wrap gap-2" aria-label={ar ? "فئات الميزات" : "Feature categories"}>
          {Object.entries(groups).map(([key, label]) => (
            <a key={key} href={`#${key}`} className="rounded-full border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
              {label[locale]}
            </a>
          ))}
        </nav>
        {Object.entries(groups).map(([key, label]) => {
          const items = marketingFeatures.filter((feature) => feature.category === key);
          return (
            <section key={key} id={key} className="scroll-mt-24 py-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-primary">{label[locale]}</p>
                  <h2 className="mt-1 text-2xl font-bold">{ar ? `${items.length} ميزات` : `${items.length} features`}</h2>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <article key={feature.slug} className="group flex h-full flex-col rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card">
                      <span className={`flex size-11 items-center justify-center rounded-xl ${iconTone[feature.accent]}`}><Icon className="size-5" /></span>
                      <p className="mt-4 text-xs font-semibold text-primary">{feature.eyebrow[locale]}</p>
                      <h3 className="mt-1 text-lg font-bold">{feature.title[locale]}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{feature.summary[locale]}</p>
                      <ul className="mt-4 space-y-2">
                        {feature.benefits.slice(0, 2).map((benefit) => <li key={benefit.en} className="flex items-start gap-2 text-xs text-muted-foreground"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" />{benefit[locale]}</li>)}
                      </ul>
                      <Button asChild variant="link" className="mt-4 w-fit px-0">
                        <Link href={`/features/${feature.slug}`}>
                          {ar ? "اكتشف الميزة" : "Explore feature"}
                          {ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
                        </Link>
                      </Button>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>
      <MarketingCta
        locale={locale}
        title={ar ? "ابنِ طريقة عمل تناسب مطعمك." : "Build a workflow that fits your restaurant."}
        description={ar ? "استكشف الباقات أو ابدأ إعداد مطعمك خطوة بخطوة." : "Compare the plans or start setting up your restaurant step by step."}
        secondaryHref="/pricing"
        secondaryLabel={ar ? "قارن الباقات" : "Compare plans"}
      />
    </main>
  );
}
