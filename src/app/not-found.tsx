import Link from "next/link";
import { getI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Logo className="mb-10" />
      <p className="text-7xl font-extrabold tracking-tight text-primary/20">404</p>
      <h1 className="mt-2 text-2xl font-bold">{t("error.notFound.title")}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("error.notFound.body")}</p>
      <Button asChild className="mt-6">
        <Link href="/">{t("common.backHome")}</Link>
      </Button>
    </div>
  );
}
