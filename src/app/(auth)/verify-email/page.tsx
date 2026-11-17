import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { VerifyEmailForm } from "./verify-email-form";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t("auth.verify.title"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    description: locale === "ar" ? "تأكيد عنوان البريد الإلكتروني" : "Verify your email address",
  };
}

type SearchParams = Promise<{ token?: string | string[] }>;

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ t }, params] = await Promise.all([getI18n(), searchParams]);
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const tokenProvided = token !== undefined;
  const validTokenShape = typeof token === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(token);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">{t("auth.verify.title")}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("auth.verify.subtitle")}</p>
      </div>
      {tokenProvided && !validTokenShape ? (
        <p role="alert" className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm">
          {t("auth.verify.invalid")}
        </p>
      ) : null}
      <VerifyEmailForm token={validTokenShape ? token : undefined} />
    </div>
  );
}
