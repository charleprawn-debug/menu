import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, dirFor, isLocale, type Locale } from "./config";
import { messages } from "./messages";

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function createTranslator(locale: Locale): Translate {
  return (key, vars) => {
    const entry = messages[key];
    let text = entry ? entry[locale] : key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
      }
    }
    return text;
  };
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get("df_locale")?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getI18n(): Promise<{ locale: Locale; dir: "rtl" | "ltr"; t: Translate }> {
  const locale = await getLocale();
  return { locale, dir: dirFor(locale), t: createTranslator(locale) };
}

export { messages };
