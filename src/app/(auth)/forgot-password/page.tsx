import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "استعادة كلمة المرور" };

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">{t("auth.forgot.title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.forgot.subtitle")}</p>
      </div>
      <ForgotForm />
    </div>
  );
}
