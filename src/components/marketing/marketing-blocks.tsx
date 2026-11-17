import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function MarketingPageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="relative overflow-hidden border-b bg-muted/25">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="container relative py-14 sm:py-20">
        <Badge variant="outline" className="mb-4 gap-1.5 border-primary/20 bg-primary/5 text-primary">
          <Sparkles className="size-3.5" />
          {eyebrow}
        </Badge>
        <h1 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
      </div>
    </section>
  );
}

export function MarketingCta({
  locale,
  title,
  description,
  primaryHref = "/register",
  primaryLabel,
  secondaryHref = "/contact",
  secondaryLabel,
}: {
  locale: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const ar = locale === "ar";
  return (
    <section className="container py-14 sm:py-20">
      <div className="relative overflow-hidden rounded-3xl bg-ink-950 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div className="absolute inset-0 dot-pattern opacity-[0.08]" />
        <div className="absolute -top-24 start-1/2 size-72 -translate-x-1/2 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">{description}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
              <Link href={primaryHref}>
                {primaryLabel || (ar ? "ابدأ تجربتك" : "Start your trial")}
                {ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link href={secondaryHref}>{secondaryLabel || (ar ? "تواصل معنا" : "Contact us")}</Link>
            </Button>
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-white/45">
            <Check className="size-3.5 text-emerald-400" />
            {ar ? "إعداد بسيط · لا يتطلب تطبيقاً للضيف" : "Straightforward setup · no guest app required"}
          </p>
        </div>
      </div>
    </section>
  );
}
