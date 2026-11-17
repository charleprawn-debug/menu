import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n";
import { ResetForm } from "./reset-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "تعيين كلمة مرور جديدة" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const { t } = await getI18n();
  const token = params.token;

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("auth.reset.invalid")}</h1>
        <Button asChild className="mt-6">
          <Link href="/forgot-password">{t("auth.forgot.title")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">{t("auth.reset.title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.reset.submit")}</p>
      </div>
      <ResetForm token={token} />
    </div>
  );
}
