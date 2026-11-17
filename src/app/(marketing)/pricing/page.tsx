import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { getLocale } from "@/i18n";
import { PricingTable, type PricingFeature, type PricingPlan } from "@/components/marketing/pricing-table";
import { MarketingPageIntro } from "@/components/marketing/marketing-blocks";
import { marketingMetadata } from "@/lib/marketing/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return marketingMetadata(locale, {
    ar: { title: "الأسعار وباقات المطاعم", description: "قارن أسعار DineFlow الشهرية والسنوية، وحدود الموظفين والطاولات والمنتجات والميزات المشمولة." },
    en: { title: "Restaurant plans & pricing", description: "Compare monthly and annual restaurant plans, staff, table and product limits, and included features." },
  }, "/pricing");
}

export default async function PricingPage() {
  const { locale } = await getI18n();
  const ar = locale === "ar";
  const plansFromDb = await db.plan.findMany({
    where: { isActive: true },
    include: { features: { include: { feature: true } } },
    orderBy: { sortOrder: "asc" },
  });

  const plans: PricingPlan[] = plansFromDb.map((plan) => ({
    id: plan.id,
    key: plan.key,
    name: plan.name,
    nameEn: plan.nameEn,
    description: plan.description,
    descriptionEn: plan.descriptionEn,
    currency: plan.currency,
    monthlyPrice: Number(plan.monthlyPrice),
    yearlyPrice: Number(plan.yearlyPrice),
    maxBranches: plan.maxBranches,
    maxStaff: plan.maxStaff,
    maxTables: plan.maxTables,
    maxProducts: plan.maxProducts,
    storageMb: plan.storageMb,
    maxOrdersPerMonth: plan.maxOrdersPerMonth,
    isPopular: plan.isPopular,
    features: plan.features.map((item) => ({ featureId: item.featureId, enabled: item.enabled, limitValue: item.limitValue, note: item.note })),
  }));

  const features: PricingFeature[] = Array.from(
    new Map(
      plansFromDb.flatMap((plan) => plan.features.map(({ feature }) => [feature.id, { id: feature.id, nameAr: feature.nameAr, nameEn: feature.nameEn }] as const))
    ).values()
  );

  return (
    <main>
      <MarketingPageIntro
        eyebrow={ar ? "خطط واضحة" : "Straightforward plans"}
        title={ar ? "قارن إعدادات الباقات الحالية." : "Compare the current plan settings."}
        description={ar ? "قارن الأسعار والحدود والميزات كما هي مضبوطة حالياً في المنصة. إذا لم تلائمك الحدود المنشورة، أخبرنا باحتياجك." : "Compare current platform-configured prices, limits and features. If the published limits do not fit your needs, tell us what you need."}
      />
      <section className="container py-12 sm:py-16">
        <PricingTable plans={plans} features={features} locale={locale} />
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
          {ar ? "الأسعار والميزات والحدود تتبع إعدادات الباقة الحالية. المقابل الشهري في الفوترة السنوية للعرض فقط؛ المبلغ السنوي هو إجمالي الفترة. ينقل التسجيل الباقة ودورة الفوترة المختارتين إلى إعداد المطعم، وقد تُنشأ تجربة وفق إعداد الخطة؛ لا يتم تحصيل أي مبلغ هنا. إدارة الاشتراك والفواتير متاحة بعد الإعداد، أما التحصيل والتجديد وتطبيق التغييرات أو الإلغاء تلقائياً فتتطلب مزود دفع وسياسة وجدولة معتمدة." : "Prices, features and limits follow current plan settings. The monthly equivalent under annual billing is for reference; the displayed annual amount is the period total. Registration carries the selected plan and billing cycle into restaurant setup and may create a trial according to the plan; no payment is collected here. Subscription and invoice management are available after setup. Payment collection, renewal and automatic application of plan changes or cancellations require an approved payment provider, billing policy and scheduler."}
        </p>
      </section>
    </main>
  );
}
