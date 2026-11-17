import Link from "next/link";
import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { getI18n } from "@/i18n";

export default async function SuspendedPage() {
  const { locale } = await getI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Logo className="mb-10" />
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        <PauseCircle className="size-8" />
      </div>
      <h1 className="text-2xl font-bold">{locale === "ar" ? "حساب المطعم موقوف مؤقتاً" : "Restaurant account suspended"}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {locale === "ar"
          ? "تم إيقاف الوصول إلى لوحة التحكم. بياناتك محفوظة بالكامل. تواصل مع الدعم لإعادة التفعيل."
          : "Dashboard access is paused. Your data is fully retained. Contact support to reactivate."}
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="mailto:support@dineflow.app">{locale === "ar" ? "تواصل مع الدعم" : "Contact support"}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{locale === "ar" ? "الرئيسية" : "Home"}</Link>
        </Button>
      </div>
    </div>
  );
}
