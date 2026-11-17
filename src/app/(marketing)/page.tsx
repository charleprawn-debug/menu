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
  Quote,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Users,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { formatMoney, toNumber } from "@/lib/money";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      title: locale === "ar" ? "منيو رقمي فوري" : "Instant digital menu",
      body:
        locale === "ar"
          ? "منيو سريع ومتوافق مع الهاتف، يتحدّث لحظياً عند تغيير الأسعار أو نفاد الأصناف."
          : "A fast, mobile-first menu that updates instantly when prices change or items sell out.",
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    {
      icon: QrCode,
      title: locale === "ar" ? "طلبات QR على الطاولة" : "QR ordering at the table",
      body:
        locale === "ar"
          ? "الزبون يمسح الكود ويطلب مباشرة — بدون تطبيق وبدون انتظار النادل."
          : "Guests scan, browse and order directly — no app download, no waiting for a waiter.",
      color: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    },
    {
      icon: ChefHat,
      title: locale === "ar" ? "شاشة مطبخ ذكية" : "Smart kitchen display",
      body:
        locale === "ar"
          ? "توزيع الطلبات على المحطات، مؤقتات تحضير، وتنبيهات فورية عند جاهزية الأصناف."
          : "Route tickets to stations, track prep timers and get instant ready alerts.",
      color: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    },
    {
      icon: Grid2x2,
      title: locale === "ar" ? "طاولات ومخطط تفاعلي" : "Tables & floor plan",
      body:
        locale === "ar"
          ? "إدارة الطاولات والجلسات والحجوزات على مخطط مرئي يعكس صالة مطعمك."
          : "Manage tables, sessions and reservations on a visual floor plan of your dining room.",
      color: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    },
    {
      icon: BarChart3,
      title: locale === "ar" ? "تقارير وتحليلات" : "Reports & analytics",
      body:
        locale === "ar"
          ? "مبيعات، منتجات، موظفون وأداء — تقارير واضحة وقابلة للتصدير في أي وقت."
          : "Sales, products, staff and performance — clear, exportable reports anytime.",
      color: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    },
    {
      icon: Sparkles,
      title: locale === "ar" ? "مساعد ذكاء اصطناعي" : "AI assistant",
      body:
        locale === "ar"
          ? "اسأل عن مبيعاتك، اطلب تحليل أدائك، أو اقترح عروضاً مبنية على بياناتك الحقيقية."
          : "Ask about your sales, analyse performance, or get offers based on your real data.",
      color: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
    },
  ];

  const steps = [
    {
      number: "01",
      title: locale === "ar" ? "أنشئ حسابك" : "Create your account",
      body: locale === "ar" ? "سجّل في أقل من دقيقة، بدون بطاقة ائتمانية." : "Sign up in under a minute, no credit card required.",
    },
    {
      number: "02",
      title: locale === "ar" ? "جهّز منيوك وطاولاتك" : "Set up your menu & tables",
      body: locale === "ar" ? "أضف الأقسام والمنتجات، وولّد أكواد QR لكل طاولة." : "Add categories and products, then generate a QR for every table.",
    },
    {
      number: "03",
      title: locale === "ar" ? "استقبل أول طلب" : "Take your first order",
      body: locale === "ar" ? "شارك المنيو وابدأ باستقبال الطلبات مباشرة من الجوال." : "Share your menu and start receiving orders straight from mobile.",
    },
  ];

  const faqs = [
    {
      q: locale === "ar" ? "هل يحتاج الزبون لتحميل تطبيق؟" : "Does the customer need an app?",
      a:
        locale === "ar"
          ? "لا. يفتح الزبون المنيو من متصفح الجوال عبر مسح QR أو الرابط، ويطلب مباشرة."
          : "No. Guests open the menu in their mobile browser via QR or link and order instantly.",
    },
    {
      q: locale === "ar" ? "هل يدعم النظام اللغة العربية؟" : "Is Arabic supported?",
      a:
        locale === "ar"
          ? "نعم، النظام عربي أولاً مع دعم كامل للإنجليزية واتجاه RTL في كل الواجهات."
          : "Yes — Arabic-first with full English support and RTL across every interface.",
    },
    {
      q: locale === "ar" ? "هل يمكنني إدارة أكثر من فرع؟" : "Can I manage multiple branches?",
      a:
        locale === "ar"
          ? "نعم، الباقات الأعلى تدعم فروعاً متعددة مع إعدادات وتقارير مستقلة لكل فرع."
          : "Yes, higher plans support multiple branches with independent settings and reports.",
    },
    {
      q: locale === "ar" ? "ماذا يحدث لبياناتي إذا أوقفت الاشتراك؟" : "What happens to my data if I cancel?",
      a:
        locale === "ar"
          ? "تبقى بياناتك محفوظة وفق سياسة الاحتفاظ، ويمكنك إعادة التفعيل دون فقدان شيء."
          : "Your data is retained under our retention policy and reactivation restores everything.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

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
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {["#059669", "#0ea5e9", "#f59e0b", "#8b5cf6"].map((color, index) => (
                    <span
                      key={color}
                      className="flex size-8 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {["MK", "SA", "OH", "NA"][index]}
                    </span>
                  ))}
                </div>
                <div className="text-xs">
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="size-3 fill-current" />
                    ))}
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    {locale === "ar" ? "أكثر من 320 مطعم يثق بنا" : "Trusted by 320+ restaurants"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                {locale === "ar" ? "بياناتك مشفّرة ومعزولة" : "Encrypted & isolated data"}
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
                <span className="mx-auto rounded-md bg-card px-3 py-0.5 text-[10px] text-muted-foreground" dir="ltr">
                  app.dineflow.com/dashboard
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
                <p className="text-[10px] font-bold">طلب جديد وصل</p>
                <p className="text-[9px] text-muted-foreground">منذ 3 ثوانٍ</p>
              </div>
            </div>
            <div className="absolute -top-3 end-6 hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 shadow-card sm:flex">
              <QrCode className="size-3.5 text-primary" />
              <span className="text-[10px] font-semibold">QR · طاولة 12</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card">
        <div className="container grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {[
            { value: "320+", label: t("landing.stats.restaurants") },
            { value: "1.2M", label: t("landing.stats.orders") },
            { value: "99.9%", label: t("landing.stats.uptime") },
            { value: "4.9/5", label: t("landing.stats.rating") },
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
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card"
            >
              <span className={`flex size-11 items-center justify-center rounded-xl ${feature.color}`}>
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </div>
          ))}
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
              {locale === "ar" ? "منيو يفتح الشهية… ويبيع." : "A menu that looks good and sells better."}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {locale === "ar"
                ? "صور واضحة، أسعار محدّثة، خيارات وإضافات، وسلة شراء سلسة — كل ذلك في متصفح الجوال وبدون تطبيق."
                : "Clear photos, live prices, modifiers and a smooth cart — all in the mobile browser, no app needed."}
            </p>
            <ul className="mt-6 space-y-3">
              {[
                locale === "ar" ? "تحميل فوري وتصميم خفيف على الإنترنت الضعيف" : "Fast loading and a lightweight design on slow networks",
                locale === "ar" ? "بحث وتصنيفات وعروض وأكثر مبيعاً" : "Search, categories, offers and best sellers",
                locale === "ar" ? "طلب من الطاولة أو استلام أو توصيل" : "Dine-in, pickup or delivery ordering",
                locale === "ar" ? "استدعاء النادل وطلب الفاتورة بضغطة" : "Call a waiter or request the bill in one tap",
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
                      { name: "مشاوي مشكلة", price: "85", emoji: "🍢", tag: "الأكثر طلباً" },
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
                        <span className="flex size-5 items-center justify-center rounded-md bg-primary text-[11px] text-white">+</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-primary px-3 py-2 text-white">
                    <span className="text-[9px]">3 أصناف · 141 ر.س</span>
                    <span className="text-[9px] font-bold">عرض السلة</span>
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
                    {locale === "ar" ? "الأكثر شيوعاً" : "Most popular"}
                  </Badge>
                ) : null}
                <h3 className="text-lg font-bold">{locale === "ar" ? plan.name : plan.nameEn || plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
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
                  {plan.features.slice(0, 5).map((planFeature) => (
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
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.testimonials.title")}</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              quote:
                locale === "ar"
                  ? "أول مرة أحس إن عندي رؤية كاملة عن مطعمي من الجوال. الطلبات صارت أسرع والمطبخ أهدأ."
                  : "For the first time I have full visibility of my restaurant from my phone. Orders are faster and the kitchen is calmer.",
              name: "سامي العتيبي",
              role: locale === "ar" ? "مالك · مطعم السدة" : "Owner · Al-Saddah",
            },
            {
              quote:
                locale === "ar"
                  ? "المنيو الرقمي رفع متوسط الفاتورة 18%، لأن الزبون صار يضيف إضافات بسهولة."
                  : "The digital menu lifted our average ticket by 18% because guests add extras effortlessly.",
              name: "نور الحمادي",
              role: locale === "ar" ? "مديرة · كافيه نور" : "Manager · Noor Cafe",
            },
            {
              quote:
                locale === "ar"
                  ? "التقارير وحدها تستاهل. أعرف أي صنف يربح وأي صنف أخفيه، بدون جداول معقدة."
                  : "The reports alone are worth it. I know which item earns and which to drop, without spreadsheets.",
              name: "خالد منصور",
              role: locale === "ar" ? "شريك · بيت المشاوي" : "Partner · Grill House",
            },
          ].map((item) => (
            <div key={item.name} className="rounded-2xl border bg-card p-6 shadow-soft">
              <Quote className="size-7 text-primary/20" />
              <p className="mt-3 text-sm leading-relaxed">{item.quote}</p>
              <div className="mt-5 flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {item.name.slice(0, 2)}
                </span>
                <div>
                  <p className="text-xs font-semibold">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">{item.role}</p>
                </div>
                <div className="ms-auto flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="size-3 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          ))}
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
              {locale === "ar" ? "بدون بطاقة ائتمانية · إلغاء في أي وقت" : "No credit card · Cancel anytime"}
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
