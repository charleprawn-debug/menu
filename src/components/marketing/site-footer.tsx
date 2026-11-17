import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getI18n } from "@/i18n";

export async function SiteFooter() {
  const { t, locale } = await getI18n();

  const columns = [
    {
      title: t("footer.product"),
      links: [
        { label: t("footer.features"), href: "/#features" },
        { label: t("footer.pricing"), href: "/#pricing" },
        { label: t("footer.demo"), href: "/r/demo" },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { label: t("footer.about"), href: "/#about" },
        { label: t("footer.contact"), href: "/#contact" },
      ],
    },
    {
      title: t("footer.resources"),
      links: [
        { label: t("footer.help"), href: "/#faq" },
        { label: t("nav.kitchen"), href: "/kitchen" },
        { label: t("nav.pos"), href: "/pos" },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { label: t("footer.terms"), href: "/#terms" },
        { label: t("footer.privacy"), href: "/#privacy" },
      ],
    },
  ];

  return (
    <footer className="border-t bg-card">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{t("app.description")}</p>
            <p className="mt-5 text-xs text-muted-foreground">
              {locale === "ar" ? "صُنع بشغف للمطاعم العربية" : "Built with care for restaurants"}
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-sm font-semibold">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} DineFlow. {t("footer.rights")}
          </p>
          <p dir="ltr">Made for modern restaurants · v1.0</p>
        </div>
      </div>
    </footer>
  );
}
