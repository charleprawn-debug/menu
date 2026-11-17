import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { title: locale === "ar" ? "تسجيل الدخول" : "Sign in" };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const { t } = await getI18n();
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("auth.login.title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
      </div>
      <LoginForm next={params.next} reset={params.reset === "1"} />
    </div>
  );
}
