import type { LegalLocale, LegalSection } from "@/lib/marketing/legal-content";
import { legalNotice } from "@/lib/marketing/legal-content";
import { MarketingPageIntro } from "@/components/marketing/marketing-blocks";

export function LegalDocument({
  locale,
  title,
  description,
  sections,
}: {
  locale: LegalLocale;
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  const ar = locale === "ar";
  return (
    <main>
      <MarketingPageIntro eyebrow={ar ? "معلومات قانونية" : "Legal information"} title={title} description={description} />
      <div className="container max-w-4xl py-10 sm:py-14">
        <aside className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100">
          <strong className="mb-1 block">{ar ? "مطلوب استكمال ومراجعة قبل الإطلاق" : "Completion and review required before launch"}</strong>
          {legalNotice[locale]}
        </aside>
        <p className="mt-6 text-xs text-muted-foreground">{ar ? "تاريخ السريان المقترح: 17 نوفمبر 2026" : "Proposed effective date: November 17, 2026"}</p>
        <div className="mt-6 space-y-8">
          {sections.map((section) => (
            <section key={section.title.en} className="border-b pb-7 last:border-0">
              <h2 className="text-lg font-bold">{section.title[locale]}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                {section.body.map((paragraph, index) => <p key={index}>{paragraph[locale]}</p>)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
