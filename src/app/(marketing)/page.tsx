import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  CreditCard,
  Grid2x2,
  Layers,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { db } from "@/lib/db";
import { getI18n, getLocale } from "@/i18n";
import { formatMoney, toNumber } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { marketingMetadata } from "@/lib/marketing/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return marketingMetadata(locale, {
    ar: { title: "نظام تشغيل المطاعم", description: "منيو رقمي ووصول الضيوف عبر QR وطاولات وتشغيل وتقارير في منصة تتوسع على مراحل." },
    en: { title: "Restaurant operating system", description: "Digital menus, QR menu access, tables, operations and reporting in a platform rolling out in phases." },
  }, "/");
}

export default async function LandingPage() {
  const { t, locale } = await getI18n();
  const plans = await db.plan.findMany({
    where: { isActive: true },
    include: { features: { include: { feature: true } } },
    orderBy: { sortOrder: "asc" },
    take: 3,
  });

  const features = [
    {
      icon: Smartphone,
      title: locale === "ar" ? "منيو رقمي" : "Digital menu",
      body:
        locale === "ar"
          ? "المنيو العام يعرض تفاصيل الأصناف المنشورة؛ أدوات تحرير المنيو ستُستكمل في مرحلة مخصصة."
          : "The public menu displays published item details; the full menu editor will be completed in its dedicated build phase.",
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    {
      icon: QrCode,
      title: locale === "ar" ? "منيو عبر QR" : "QR menu access",
      body:
        locale === "ar"
          ? "رمز QR المرتبط برابط المنيو يفتحه في المتصفح؛ مولّد QR داخل التطبيق وإرسال الطلب سيأتيان في مراحل لاحقة."
          : "A QR code linked to the menu URL opens it in a browser; in-app QR generation and guest ordering are later phases.",
      color: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    },
    {
      icon: ChefHat,
      title: locale === "ar" ? "مسار المطبخ — مرحلة لاحقة" : "Kitchen workflow — later phase",
      body:
        locale === "ar"
          ? "شاشة المطبخ ومتابعة التحضير ستُبنيان بعد اكتمال مسار الطلبات."
          : "The kitchen display and preparation tracking will follow completion of the order workflow.",
      color: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    },
    {
      icon: Grid2x2,
      title: locale === "ar" ? "إدارة الطاولات — مرحلة لاحقة" : "Table management — later phase",
      body:
        locale === "ar"
          ? "مخطط الصالة والجلسات والحجوزات ضمن مرحلة تطوير الطاولات."
          : "Floor plans, sessions and reservations belong to the upcoming table-management phase.",
      color: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    },
    {
      icon: BarChart3,
      title: locale === "ar" ? "تقارير وتحليلات" : "Reports & analytics",
      body:
        locale === "ar"
          ? "تُطوّر أدوات تحليل المبيعات والمنتجات والموظفين ضمن مراحل إطلاق التقارير."
          : "Sales, product and staff analytics will roll out with the reporting workflows.",
      color: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    },
    {
      icon: Sparkles,
      title: locale === "ar" ? "مساعد ذكاء اصطناعي" : "AI assistant",
      body:
        locale === "ar"
          ? "المساعد الذكي ضمن خارطة التطوير، وسيتاح مع إطلاق مسارات التحليل المناسبة."
          : "The AI assistant is on the roadmap and will follow rollout of the supporting analytics workflows.",
      color: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
    },
  ];

  const steps = [
    {
      number: "01",
      title: locale === "ar" ? "استعرض المنيو التجريبي" : "Browse the sample menu",
      body: locale === "ar" ? "تعرّف على تجربة تصفّح القائمة؛ لا يمكن إرسال الطلبات من المنيو حالياً." : "Explore the menu-browsing experience; ordering is not available from the menu yet.",
    },
    {
      number: "02",
      title: locale === "ar" ? "أنشئ حساباً وأكمل البيانات الأساسية" : "Create an account and add basic details",
      body: locale === "ar" ? "تسجيل الحساب وبيانات المطعم الأولية متاحان؛ المعالج الكامل وتحرير المنيو والطاولات ستُستكمل لاحقاً." : "Account creation and initial restaurant details are available; full onboarding, menu editing and table tools are still upcoming.",
    },
    {
      number: "03",
      title: locale === "ar" ? "تابع مراحل الإطلاق" : "Follow the rollout",
      body: locale === "ar" ? "الطلبات عبر الإنترنت والطاولات والمطبخ والاشتراكات تُستكمل في الخطوات المخصصة لها." : "Online ordering, table operations, kitchen workflows and subscriptions will be completed in their dedicated build steps.",
    },
  ];

  const faqs = [
    {
      q: locale === "ar" ? "هل يحتاج الزبون لتحميل تطبيق؟" : "Does the customer need an app?",
      a:
        locale === "ar"
          ? "لا. يفتح الضيف المنيو في متصفح الهاتف عبر QR أو الرابط؛ إرسال الطلب إلكترونياً سيُتاح في مرحلة لاحقة."
          : "No. Guests open the menu in a mobile browser via QR or link; online order submission will be available in a later phase.",
    },
    {
      q: locale === "ar" ? "هل يدعم الموقع اللغة العربية والإنجليزية؟" : "Are Arabic and English supported?",
      a:
        locale === "ar"
          ? "نعم، صفحات الموقع والمنيو العام متاحة بالعربية والإنجليزية. بعض شاشات لوحة المطعم ما زالت ضمن مراحل البناء."
          : "Yes, the marketing site and public menu are available in Arabic and English. Some restaurant-dashboard screens are still being built.",
    },
    {
      q: locale === "ar" ? "هل إدارة الفروع المتعددة متاحة الآن؟" : "Is multi-branch management available now?",
      a:
        locale === "ar"
          ? "إدارة الفروع ضمن خارطة المنتج؛ تفاصيل الحدود الظاهرة في الباقات هي إعدادات الخطة وليست تفعيل اشتراك أو ميزة تشغيلية حالياً."
          : "Multi-branch management is on the product roadmap. Limits shown on pricing are plan settings, not an active subscription or operational feature today.",
    },
    {
      q: locale === "ar" ? "ماذا يحدث لبياناتي إذا أوقفت الاشتراك؟" : "What happens to my data if I cancel?",
      a:
        locale === "ar"
          ? "تختلف إتاحة البيانات بعد إيقاف الخدمة بحسب الاتفاق وسياسة الاحتفاظ. نزّل السجلات التي تحتاجها قبل الإيقاف وتواصل معنا للاستفسار عن حسابك."
          : "Data availability after service ends depends on the applicable agreement and retention policy. Export records you need before cancellation and contact us about your account.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-[0.35]" />
        <div className="absolute -top-40 start-1/2 size-[620px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="container relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-in">
            <Badge variant="outline" className="mb-5 gap-1.5 border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              <Sparkles className="size-3.5" />
              {t("landing.badge")}
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
              {t("landing.hero.title")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="xl" className="shadow-glow">
                <Link href="/register">
                  {t("landing.cta.start")}
                  <ArrowLeft className="size-4 rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/r/demo">
                  <Smartphone className="size-4" />
                  {t("landing.cta.demo")}
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Smartphone className="size-4 text-primary" />
                {locale === "ar" ? "تجربة عبر متصفح الجوال" : "Mobile-browser experience"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                {locale === "ar" ? "أدوار وصلاحيات للفريق" : "Team roles and permissions"}
              </div>
            </div>
          </div>

          {/* Dashboard mock */}
          <div className="relative animate-fade-in animate-delay-200">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-emerald-500/15 via-teal-400/5 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border bg-card shadow-pop">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
                <span className="mx-auto rounded-md bg-card px-3 py-0.5 text-[10px] text-muted-foreground">
                  {locale === "ar" ? "معاينة لوحة التحكم · بيانات تجريبية" : "Dashboard preview · sample data"}
                </span>
              </div>
              <div className="flex">
                <div className="hidden w-32 shrink-0 border-e bg-muted/20 p-3 sm:block">
                  <div className="mb-4 flex items-center gap-1.5">
                    <span className="size-5 rounded-md bg-primary" />
                    <span className="text-[10px] font-bold">DineFlow</span>
                  </div>
                  {["نظرة عامة", "الطلبات", "المنيو", "الطاولات", "التقارير"].map((item, index) => (
                    <div
                      key={item}
                      className={`mb-1 rounded-md px-2 py-1.5 text-[9px] ${index === 0 ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground"}`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground">مبيعات اليوم</p>
                      <p className="text-lg font-bold tabular">12,480 ر.س</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                      ▲ 12.4%
                    </span>
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {[
                      { label: "الطلبات", value: "184" },
                      { label: "المتوسط", value: "68" },
                      { label: "الطاولات", value: "12/18" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg border bg-card p-2">
                        <p className="text-[8px] text-muted-foreground">{stat.label}</p>
                        <p className="text-xs font-bold tabular">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3 flex h-24 items-end gap-1.5 rounded-lg border bg-card p-2">
                    {[42, 58, 36, 74, 62, 88, 70, 95, 66, 82, 74, 90].map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400"
                        style={{ height: `${height}%`, opacity: 0.45 + index * 0.04 }}
                      />
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { id: "#1042", table: "طاولة 4", total: "148", status: "قيد التحضير", color: "bg-amber-100 text-amber-700" },
                      { id: "#1041", table: "توصيل", total: "92", status: "جديد", color: "bg-sky-100 text-sky-700" },
                      { id: "#1040", table: "طاولة 9", total: "210", status: "جاهز", color: "bg-emerald-100 text-emerald-700" },
                    ].map((order) => (
                      <div key={order.id} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5">
                        <span className="text-[9px] font-bold text-primary" dir="ltr">
                          {order.id}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{order.table}</span>
                        <span className={`ms-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${order.color}`}>
                          {order.status}
                        </span>
                        <span className="text-[9px] font-bold tabular">{order.total} ر.س</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -start-4 hidden items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-card sm:flex">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Zap className="size-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold">{locale === "ar" ? "إشعار تجريبي" : "Sample notification"}</p>
                <p className="text-[9px] text-muted-foreground">{locale === "ar" ? "بيانات توضيحية" : "Illustrative data"}</p>
              </div>
            </div>
            <div className="absolute -top-3 end-6 hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 shadow-card sm:flex">
              <QrCode className="size-3.5 text-primary" />
              <span className="text-[10px] font-semibold">QR · طاولة 12</span>
            </div>
          </div>
        </div>
      </section>

      {/* Product facts */}
      <section className="border-y bg-card">
        <div className="container grid grid-cols-1 gap-6 py-8 sm:grid-cols-3">
          {[
            { value: "11", label: locale === "ar" ? "ميزة ضمن نطاق المنصة" : "features in the platform scope" },
            { value: "AR · EN", label: locale === "ar" ? "واجهة عربية وإنجليزية" : "Arabic and English interface" },
            { value: "QR", label: locale === "ar" ? "وصول للمنيو من المتصفح" : "Browser-based menu access" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container scroll-mt-20 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="muted" className="mb-3">
            {t("footer.features")}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.features.title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("landing.features.subtitle")}</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Link
              href={`/features/${["digital-menu", "qr-ordering", "kitchen-display", "table-management", "analytics", "ai-assistant"][index]}`}
              key={feature.title}
              className="group block rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card"
            >
              <span className={`flex size-11 items-center justify-center rounded-xl ${feature.color}`}>
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link href="/features">{locale === "ar" ? "استكشف جميع الميزات الـ11" : "Explore all 11 features"}</Link>
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {[
            { icon: Layers, label: locale === "ar" ? "أقسام ومنتجات" : "Categories & products" },
            { icon: Users, label: locale === "ar" ? "موظفون وصلاحيات" : "Staff & permissions" },
            { icon: CreditCard, label: locale === "ar" ? "فواتير ومدفوعات" : "Invoices & payments" },
            { icon: UtensilsCrossed, label: locale === "ar" ? "نقطة بيع" : "POS" },
            { icon: BarChart3, label: locale === "ar" ? "تقارير متقدمة" : "Advanced reports" },
          ].map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <item.icon className="size-3.5 text-primary" />
              {item.label}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-y bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="muted" className="mb-3">
              {locale === "ar" ? "البداية" : "Getting started"}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.how.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.how.subtitle")}</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative rounded-2xl border bg-card p-6 shadow-soft">
                <span className="text-4xl font-extrabold text-primary/15">{step.number}</span>
                <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Menu preview */}
      <section className="container py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge variant="muted" className="mb-3">
              {locale === "ar" ? "تجربة الزبون" : "Guest experience"}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {locale === "ar" ? "منيو رقمي واضح وسهل التصفّح." : "A clear digital menu guests can browse."}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {locale === "ar"
                ? "اعرض الصور والوصف والأسعار في تجربة ويب ملائمة للجوال. المنيو الحالي للتصفّح؛ إرسال الطلب سيُضاف في مرحلة لاحقة."
                : "Present photos, descriptions and prices in a mobile-friendly web menu. The current guest view is browse-only; online ordering will follow later."}
            </p>
            <ul className="mt-6 space-y-3">
              {[
                locale === "ar" ? "تحميل فوري وتصميم خفيف على الإنترنت الضعيف" : "Fast loading and a lightweight design on slow networks",
                locale === "ar" ? "بحث وتنقّل بين التصنيفات وأصناف مميزة" : "Search, category navigation and featured dishes",
                locale === "ar" ? "عرض عربي أو إنجليزي بحسب محتوى المنيو" : "Arabic or English display based on menu content",
                locale === "ar" ? "رابط اتصال بالمطعم عند إضافة رقم الهاتف" : "A call link when the restaurant adds its phone number",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-7" variant="outline">
              <Link href="/r/demo">
                {t("common.tryMenu")}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            </Button>
          </div>

          <div className="flex justify-center">
            <div className="relative w-[290px] rounded-[2.5rem] border-[10px] border-ink-900 bg-card shadow-pop">
              <div className="absolute start-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-ink-900 rtl:translate-x-1/2" />
              <div className="max-h-[520px] overflow-hidden rounded-[1.9rem]">
                <div className="relative h-28 bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white">
                  <div className="mt-4 flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-sm font-bold">DF</span>
                    <div>
                      <p className="text-sm font-bold">مطعم البيت الشامي</p>
                      <p className="text-[9px] text-white/70">مطبخ شامي · الرياض</p>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="mb-2 flex gap-1.5 overflow-hidden">
                    {["الكل", "مشاوي", "مقبلات", "حلويات"].map((tab, index) => (
                      <span
                        key={tab}
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-medium ${index === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: "مشاوي مشكلة", price: "85", emoji: "🍢", tag: locale === "ar" ? "طبق مميز" : "Featured dish" },
                      { name: "حمص باللحمة", price: "32", emoji: "🥣" },
                      { name: "فتوش", price: "24", emoji: "🥗" },
                      { name: "كنافة", price: "28", emoji: "🍮" },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center gap-2 rounded-xl border bg-card p-2">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-orange-100 text-lg">
                          {item.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-semibold">{item.name}</p>
                          {item.tag ? <p className="text-[8px] text-primary">{item.tag}</p> : null}
                          <p className="text-[9px] font-bold">{item.price} ر.س</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-center rounded-xl border bg-muted/40 px-3 py-2 text-center text-[9px] text-muted-foreground">
                    {locale === "ar" ? "معاينة المنيو — التصفّح فقط" : "Menu preview — browse only"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-y bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="muted" className="mb-3">
              {t("footer.pricing")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.pricing.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.pricing.subtitle")}</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {(plans.length ? plans : []).map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-card p-6 shadow-soft ${plan.isPopular ? "border-primary shadow-glow" : ""}`}
              >
                {plan.isPopular ? (
                  <Badge className="absolute -top-3 start-1/2 z-10 -translate-x-1/2 bg-primary text-primary-foreground shadow-card rtl:translate-x-1/2">
                    {locale === "ar" ? "موصى بها" : "Recommended"}
                  </Badge>
                ) : null}
                <h3 className="text-lg font-bold">{locale === "ar" ? plan.name : plan.nameEn || plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{locale === "ar" ? plan.description : plan.descriptionEn || plan.description}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">
                    {formatMoney(plan.monthlyPrice, plan.currency, locale, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="pb-1 text-xs text-muted-foreground">/{locale === "ar" ? "شهر" : "mo"}</span>
                </div>
                <Button asChild className="mt-5 w-full" variant={plan.isPopular ? "default" : "outline"}>
                  <Link href="/register">{t("common.getStarted")}</Link>
                </Button>
                <ul className="mt-6 space-y-2.5">
                  {[
                    `${plan.maxProducts === -1 ? "∞" : plan.maxProducts} ${locale === "ar" ? "منتج" : "products"}`,
                    `${plan.maxTables === -1 ? "∞" : plan.maxTables} ${locale === "ar" ? "طاولة" : "tables"}`,
                    `${plan.maxStaff === -1 ? "∞" : plan.maxStaff} ${locale === "ar" ? "موظف" : "staff"}`,
                    `${plan.maxBranches === -1 ? "∞" : plan.maxBranches} ${locale === "ar" ? "فرع" : "branches"}`,
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-primary" />
                      {item}
                    </li>
                  ))}
                  {plan.features.filter((planFeature) => planFeature.enabled).slice(0, 5).map((planFeature) => (
                    <li key={planFeature.featureId} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-primary" />
                      {locale === "ar" ? planFeature.feature.nameAr : planFeature.feature.nameEn}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {plans.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {locale === "ar" ? "سيتم عرض الباقات بعد إعداد المنصة." : "Plans will appear once the platform is seeded."}
            </p>
          ) : null}
          <div className="mt-8 text-center">
            <Button asChild variant="outline"><Link href="/pricing">{locale === "ar" ? "قارن جميع الأسعار والميزات" : "Compare all plans and features"}</Link></Button>
          </div>
        </div>
      </section>

      {/* Operating principles */}
      <section className="border-y bg-muted/20 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="muted" className="mb-3">{locale === "ar" ? "مصمّم حول التشغيل" : "Designed around operations"}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{locale === "ar" ? "ابدأ بالمنيو، وتوسّع مع المراحل القادمة." : "Start with the menu and grow into upcoming phases."}</h2>
            <p className="mt-3 text-muted-foreground">{locale === "ar" ? "المنيو العام للتصفح متاح الآن؛ الطلبات والطاولات والمطبخ والتقارير قيد الإطلاق المرحلي." : "The public menu is available for browsing; orders, tables, kitchen and reports are rolling out in later phases."}</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: QrCode, title: locale === "ar" ? "تصفح المنيو عبر QR" : "Browse the menu via QR", body: locale === "ar" ? "يفتح رابط المنيو في متصفح الجوال؛ إرسال الطلب غير متاح حالياً." : "The menu link opens in a mobile browser; online order submission is not active yet." },
              { icon: ChefHat, title: locale === "ar" ? "الطلبات والمطبخ — لاحقاً" : "Orders and kitchen — later", body: locale === "ar" ? "سلة الضيف وتوجيه الطلب وشاشة المطبخ ضمن خطوات التطوير القادمة." : "Guest carts, order routing and kitchen display are part of upcoming build steps." },
              { icon: BarChart3, title: locale === "ar" ? "التقارير — مرحلة لاحقة" : "Reporting — later phase", body: locale === "ar" ? "تحليل الأداء والتقارير التشغيلية ستُستكمل في مرحلة التقارير." : "Performance analytics and operational reports will be completed in the reporting phase." },
            ].map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl border bg-card p-6 shadow-soft">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-y bg-muted/30 py-20">
        <div className="container max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.faq.title")}</h2>
          </div>
          <div className="mt-8 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group rounded-xl border bg-card px-5 py-4 shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                  {faq.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-7 text-center">
            <Button asChild variant="link"><Link href="/faq">{locale === "ar" ? "تصفّح جميع الأسئلة الشائعة" : "Browse all frequently asked questions"}</Link></Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink-950 px-6 py-16 text-center text-white">
          <div className="absolute inset-0 dot-pattern opacity-[0.08]" />
          <div className="absolute -top-24 start-1/2 size-72 -translate-x-1/2 rounded-full bg-emerald-500/25 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.cta.title")}</h2>
            <p className="mt-3 text-white/60">{t("landing.cta.subtitle")}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600">
                <Link href="/register">
                  {t("common.getStarted")}
                  <ArrowLeft className="size-4 rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href="/r/demo">{t("common.tryMenu")}</Link>
              </Button>
            </div>
            <p className="mt-4 text-[11px] text-white/40">
              {locale === "ar" ? "لا يُطلب دفع عند إنشاء الحساب" : "No payment is required at sign-up"}
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
