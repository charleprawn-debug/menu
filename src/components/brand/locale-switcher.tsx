"use client";

import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname() || "/";
  const nextLocale = locale === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => {
        const routeWithoutLocale = pathname.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";
        const query = window.location.search;
        window.location.assign(`/${nextLocale}${routeWithoutLocale === "/" ? "" : routeWithoutLocale}${query}`);
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-transparent px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50",
        className
      )}
      aria-label={t("common.language")}
    >
      <Languages className="size-4" />
      {!compact ? <span>{t("locale.switch")}</span> : null}
    </button>
  );
}
