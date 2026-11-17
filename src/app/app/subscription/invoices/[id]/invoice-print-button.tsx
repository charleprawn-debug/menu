"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InvoicePrintButton({ locale }: { locale: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer />
      {locale === "ar" ? "طباعة / حفظ كملف PDF" : "Print / Save as PDF"}
    </Button>
  );
}
