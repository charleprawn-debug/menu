import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default async function RegisterPage() {
  const { t } = await getI18n();
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">{t("auth.register.title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>
      </div>
      <RegisterForm />
    </div>
  );
}
