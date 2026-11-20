"use client";

export function PrintReportButton({ locale }: { locale: string }) {
  const ar = locale === "ar";
  return <button type="button" onClick={() => window.print()} className="rounded-lg border px-4 py-2 text-sm font-medium print:hidden">{ar ? "طباعة / حفظ PDF" : "Print / Save PDF"}</button>;
}
