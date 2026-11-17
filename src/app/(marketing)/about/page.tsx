import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Blocks, HeartHandshake, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { getI18n } from "@/i18n";
import { getLocale } from "@/i18n";
import { MarketingPageIntro, MarketingCta } from "@/components/marketing/marketing-blocks";
import { Button } from "@/components/ui/button";
import { marketingMetadata } from "@/lib/marketing/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return marketingMetadata(locale, {
    ar: { title: "عن منصة المطاعم", description: "تعرف على رؤية DineFlow لربط المنيو والطلبات والمطبخ والفريق في منصة تشغيل واحدة للمطاعم." },
    en: { title: "About the platform", description: "Learn how DineFlow connects restaurant menus, orders, kitchen work, teams and insights in one operating platform." },
  }, "/about");
}

export default async function AboutPage() {
  const { locale } = await getI18n();
  const ar = locale === "ar";
  const principles = [
    { icon: Blocks, title: ar ? "العمل مترابط" : "Connected work", body: ar ? "يبدأ الطلب من تجربة الضيف ثم ينتقل إلى الفريق؛ الأدوات الأفضل تحافظ على السياق بين الخطوات." : "An order starts in the guest experience and moves to the team; useful tools keep context between steps." },
    { icon: SlidersHorizontal, title: ar ? "المرونة دون فوضى" : "Flexible, not fragmented", body: ar ? "إعدادات واضحة وحدود وصلاحيات تساعد المطعم على تشكيل النظام لاحتياجه مع الحفاظ على تنظيمه." : "Clear settings, limits and permissions help a restaurant shape the system without losing structure." },
    { icon: HeartHandshake, title: ar ? "الضيف والفريق معاً" : "Guests and teams together", body: ar ? "نجاح التجربة لا يقاس بالشاشة وحدها؛ يجب أن تكون مفهومة للضيف وعملية لمن يقدم الخدمة." : "A good experience is not just a screen; it should make sense to guests and work for the people serving them." },
    { icon: ShieldCheck, title: ar ? "الوصول بمسؤولية" : "Responsible access", body: ar ? "تفصل الأدوار والصلاحيات المهام، وتساعد أصحاب المطاعم على إظهار ما يحتاجه كل عضو فقط." : "Roles and permissions separate responsibilities and help owners show each member only what they need." },
  ];
  return (
    <main>
      <MarketingPageIntro
        eyebrow={ar ? "عن DineFlow" : "About DineFlow"}
        title={ar ? "تقنية تشغيل تترك مساحة أكبر للضيافة." : "Restaurant technology that leaves more room for hospitality."}
        description={ar ? "نبني منصة تساعد المطاعم على ربط المنيو والطلبات والطاولات والمطبخ والفريق والتحليلات في مكان واحد، حتى يكون التشغيل أوضح من دون أن يفقد طابعه الإنساني." : "We are building a platform to connect menus, orders, tables, kitchen, staff and insights in one place—making operations clearer without losing the human side of hospitality."}
      />
      <section className="container py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{ar ? "رؤيتنا" : "Our point of view"}</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight">{ar ? "أقل أدوات متفرقة. رؤية أوضح للعمل." : "Fewer disconnected tools. A clearer view of the work."}</h2>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>{ar ? "المطعم يعمل بإيقاع سريع: صنف يتغير، طاولة تنتظر، طلب يدخل المطبخ، وموظف يحتاج إلى معلومة في وقتها. صُمّم DineFlow ليجمع هذه التفاصيل في سير عمل يمكن للفريق فهمه." : "Restaurants move quickly: a dish changes, a table is waiting, an order enters the kitchen and a teammate needs the right information at the right moment. DineFlow is designed to bring these details into a workflow a team can understand."}</p>
            <p>{ar ? "نحن نطوّر المنتج خطوة بخطوة حول احتياجات المطاعم الفعلية—من عرض المنيو وتجربة QR إلى أدوات الإدارة والتقارير—مع إبقاء حدود الميزات والاشتراك واضحة." : "We are developing the product step by step around practical restaurant needs—from menu presentation and QR experiences to management tools and reporting—while keeping feature and plan boundaries clear."}</p>
            <Button asChild variant="link" className="px-0"><Link href="/features">{ar ? "اكتشف المنصة" : "Explore the platform"}{ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}</Link></Button>
          </div>
        </div>
      </section>
      <section className="border-y bg-muted/20 py-14 sm:py-20">
        <div className="container">
          <div className="max-w-2xl"><p className="text-xs font-semibold text-primary">{ar ? "مبادئ المنتج" : "Product principles"}</p><h2 className="mt-2 text-3xl font-bold">{ar ? "قرارات التصميم تنطلق من أرض المطعم." : "Product decisions start on the restaurant floor."}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{ar ? "هذه المبادئ ترشد طريقة بناء كل تجربة، من صفحة المنيو العامة إلى أدوات المدير." : "These principles guide each experience, from the public menu to the manager's tools."}</p></div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {principles.map(({ icon: Icon, title, body }) => <article key={title} className="rounded-2xl border bg-card p-6 shadow-soft"><span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span><h3 className="mt-4 text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p></article>)}
          </div>
        </div>
      </section>
      <MarketingCta locale={locale} title={ar ? "اكتشف ما يمكن أن يفعله DineFlow لمطعمك." : "Explore what DineFlow can do for your restaurant."} description={ar ? "اطّلع على الميزات أو قارن الخطط أو ابدأ إعداد حسابك." : "Explore the features, compare plans or start setting up your account."} secondaryHref="/contact" secondaryLabel={ar ? "تواصل معنا" : "Contact us"} />
    </main>
  );
}
