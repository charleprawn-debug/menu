const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_REPORT_RANGE_MS = 366 * DAY_MS;

export interface ReportDateRange {
  start: Date;
  /** Exclusive end; UI end dates are inclusive. */
  end: Date;
}

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : parsed;
}

export function parseReportDateRange(startValue?: string | null, endValue?: string | null): ReportDateRange | null {
  const start = parseDateInput(startValue);
  const lastDay = parseDateInput(endValue);
  if (!start || !lastDay || lastDay < start) return null;
  const end = new Date(lastDay.getTime() + DAY_MS);
  if (end.getTime() - start.getTime() > MAX_REPORT_RANGE_MS) return null;
  return { start, end };
}

export function defaultReportDateRange(now = new Date()): ReportDateRange {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start, end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) };
}

export function pageReportDateRange(startValue?: string | null, endValue?: string | null, now = new Date()) {
  const parsed = parseReportDateRange(startValue, endValue);
  const requested = Boolean(startValue || endValue);
  return { range: parsed ?? defaultReportDateRange(now), invalid: requested && !parsed };
}

export function formatReportDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}
