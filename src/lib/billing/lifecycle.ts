import "server-only";

/** Safe default is no grace; malformed or out-of-range values do not extend access. */
export function configuredGracePeriodDays(): number {
  const raw = process.env.BILLING_GRACE_DAYS;
  if (!raw || !/^\d+$/.test(raw)) return 0;
  const days = Number(raw);
  return Number.isSafeInteger(days) && days >= 0 && days <= 30 ? days : 0;
}

export function graceEndFor(periodEnd: Date, days = configuredGracePeriodDays()): Date {
  return new Date(periodEnd.getTime() + days * 24 * 60 * 60 * 1000);
}
