"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isLocale, type Locale } from "@/i18n/config";

export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set("df_locale", locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
