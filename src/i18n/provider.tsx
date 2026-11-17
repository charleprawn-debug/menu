"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { dirFor, type Locale } from "./config";
import { messages } from "./messages";

interface I18nValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const t = (key: string, vars?: Record<string, string | number>) => {
      const entry = messages[key];
      let text = entry ? entry[locale] : key;
      if (vars) {
        for (const [name, val] of Object.entries(vars)) {
          text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(val));
        }
      }
      return text;
    };
    return { locale, dir: dirFor(locale), t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return context;
}
