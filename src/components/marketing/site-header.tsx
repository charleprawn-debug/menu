"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/#features", label: t("footer.features") },
    { href: "/#how", label: t("landing.how.title") },
    { href: "/#pricing", label: t("footer.pricing") },
    { href: "/#faq", label: t("landing.faq.title") },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-transparent transition-colors",
        transparent ? "bg-transparent" : "glass border-border/70"
      )}
    >
      <div className="container flex h-16 items-center gap-3">
        <Link href="/" aria-label="DineFlow">
          <Logo />
        </Link>

        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1 md:ms-0">
          <div className="hidden items-center gap-1 sm:flex">
            <ThemeToggle />
            <LocaleSwitcher compact />
          </div>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">{t("auth.login.submit")}</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/register">
              {t("common.getStarted")}
              <ArrowRight className="size-3.5 rtl:rotate-180" />
            </Link>
          </Button>
          <button
            onClick={() => setOpen((value) => !value)}
            className="ms-1 rounded-lg p-2 text-muted-foreground hover:bg-accent md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t bg-card px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent">
              {t("auth.login.submit")}
            </Link>
            <Button asChild className="mt-2">
              <Link href="/register">{t("common.getStarted")}</Link>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
