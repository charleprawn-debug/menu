"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-8" />
      </div>
      <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        نعتذر عن ذلك. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-muted-foreground">Ref: {error.digest}</p> : null}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>إعادة المحاولة</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          الرئيسية
        </Button>
      </div>
    </div>
  );
}
