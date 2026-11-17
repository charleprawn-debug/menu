import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/i18n";

export default async function ForbiddenPage() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-8" />
      </div>
      <h1 className="text-2xl font-bold">{t("error.forbidden.title")}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("error.forbidden.body")}</p>
      <Button asChild className="mt-6">
        <Link href="/app/dashboard">{t("common.backHome")}</Link>
      </Button>
    </div>
  );
}
