import Link from "next/link";
import { CheckCircle2, Star } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { getI18n } from "@/i18n";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getI18n();

  const bullets =
    locale === "ar"
      ? ["منيو رقمي وطلبات فورية", "شاشة مطبخ ونقطة بيع", "تقارير وذكاء اصطناعي"]
      : ["Digital menu and live orders", "Kitchen display and POS", "Analytics and AI insights"];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 grid-pattern opacity-[0.07]" />
        <div className="absolute -end-32 -top-32 size-[420px] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -start-24 size-[380px] rounded-full bg-teal-400/10 blur-3xl" />

        <div className="relative">
          <Link href="/" className="inline-flex">
            <Logo textClassName="text-white" subtitle={t("app.tagline")} />
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight text-balance">
            {locale === "ar" ? "كل مطعمك… بشاشة واحدة." : "Your whole restaurant… one screen."}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            {locale === "ar"
              ? "من أول طلب على الطاولة إلى آخر تقرير مبيعات، DineFlow يجمع كل عمليات مطعمك في مكان واحد."
              : "From the first table order to the last sales report, DineFlow brings every restaurant operation together."}
          </p>
          <ul className="mt-8 space-y-3">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-center gap-3 text-sm text-white/80">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
          <div className="mb-2 flex gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-3.5 fill-current" />
            ))}
          </div>
          <p className="text-sm leading-relaxed text-white/80">
            {locale === "ar"
              ? "«خفّضنا وقت استلام الطلبات 40%، وصار عندنا رؤية واضحة لكل فرع بلحظة.»"
              : "\"We cut order handling time by 40% and finally have real-time visibility across every branch.\""}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
              OA
            </div>
            <div>
              <p className="text-xs font-semibold">Omar Al-Rashid</p>
              <p className="text-[11px] text-white/50">
                {locale === "ar" ? "مالك 3 مطاعم · الرياض" : "Owner of 3 restaurants · Riyadh"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Link href="/">
            <Logo />
          </Link>
          <LogoMark className="opacity-0" size={1} />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-4 sm:px-8">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
        <div className="px-6 pb-6 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} DineFlow · {t("footer.rights")}
        </div>
      </div>
    </div>
  );
}
