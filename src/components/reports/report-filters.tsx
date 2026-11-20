interface ReportBranchOption {
  id: string;
  name: string;
}

export function ReportFilters({
  locale,
  action,
  start,
  end,
  branches,
  branchId,
  invalidRange = false,
}: {
  locale: string;
  action: string;
  start: string;
  end: string;
  branches: ReportBranchOption[];
  branchId?: string;
  invalidRange?: boolean;
}) {
  const ar = locale === "ar";
  const text = (en: string, arabic: string) => ar ? arabic : en;
  return <>
    <form method="get" action={action} dir={ar ? "rtl" : "ltr"} className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_1fr_1.2fr_auto] print:hidden">
      <label className="grid gap-1 text-sm">{text("From", "من تاريخ")}<input name="start" type="date" required defaultValue={start} className="rounded-lg border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">{text("Through", "حتى تاريخ")}<input name="end" type="date" required defaultValue={end} className="rounded-lg border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">{text("Branch", "الفرع")}<select name="branchId" defaultValue={branchId ?? ""} className="rounded-lg border bg-background px-3 py-2"><option value="">{text("All permitted branches", "كل الفروع المسموحة")}</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <button type="submit" className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{text("Apply filters", "تطبيق الفلاتر")}</button>
    </form>
    {invalidRange ? <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" dir={ar ? "rtl" : "ltr"}>{text("The requested range is invalid or exceeds 366 days. Showing this month instead.", "الفترة المطلوبة غير صالحة أو تتجاوز 366 يوماً؛ نعرض بيانات هذا الشهر بدلاً منها.")}</p> : null}
  </>;
}
