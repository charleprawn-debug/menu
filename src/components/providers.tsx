"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/controls";
import { I18nProvider } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale}>
        <TooltipProvider delayDuration={200}>
          {children}
          <AppToaster />
        </TooltipProvider>
      </I18nProvider>
    </NextThemesProvider>
  );
}

function AppToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={(resolvedTheme as "light" | "dark") || "light"}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ className: "font-sans" }}
    />
  );
}
