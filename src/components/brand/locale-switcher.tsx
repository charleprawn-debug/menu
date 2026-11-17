"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/app/actions/locale";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const nextLocale = locale === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setLocaleAction(nextLocale);
          router.refresh();
        })
      }
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
