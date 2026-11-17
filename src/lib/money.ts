/**
 * Money utilities.
 * All arithmetic happens on integer minor units (cents/fils) to avoid
 * floating-point drift. Amounts are stored as Decimal(12,2) in PostgreSQL.
 */

export type MoneyInput = number | string | { toString(): string } | null | undefined;

export const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  SAR: 2,
  AED: 2,
  QAR: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  JOD: 3,
  EGP: 2,
  IQD: 3,
  LBP: 2,
  MAD: 2,
  TND: 3,
  DZD: 2,
  TRY: 2,
};

export function currencyDecimals(currency = "USD"): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
}

export function toNumber(value: MoneyInput): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

export function toMinor(value: MoneyInput, currency = "USD"): number {
  const factor = 10 ** currencyDecimals(currency);
  return Math.round(toNumber(value) * factor);
}

export function fromMinor(minor: number, currency = "USD"): number {
  const factor = 10 ** currencyDecimals(currency);
  return minor / factor;
}

export function formatMoney(
  value: MoneyInput,
  currency = "USD",
  locale = "ar",
  options: Intl.NumberFormatOptions = {}
): string {
  const amount = toNumber(value);
  const decimals = currencyDecimals(currency);
  const minimumFractionDigits = decimals === 3 ? 3 : Number.isInteger(amount) ? 0 : decimals;
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits: decimals,
      ...options,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(value: number, locale = "ar"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(value);
}

export function formatPercent(value: number, locale = "ar", digits = 1): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value / 100);
}

export interface TaxLine {
  unitPrice: number;
  quantity: number;
  modifiers?: number[];
  taxRate?: number;
}

export interface TotalsInput {
  lines: TaxLine[];
  currency?: string;
  discount?: number;
  discountType?: "PERCENTAGE" | "FIXED";
  serviceFeeRate?: number;
  deliveryFee?: number;
  tip?: number;
  taxInclusive?: boolean;
}

export interface Totals {
  subtotal: number;
  discount: number;
  taxableBase: number;
  tax: number;
  serviceFee: number;
  deliveryFee: number;
  tip: number;
  total: number;
  itemsCount: number;
}

/**
 * Server-authoritative order calculation.
 * Prices are always re-read from the database by callers; this helper only
 * performs arithmetic on already-verified values.
 */
export function calculateTotals(input: TotalsInput): Totals {
  const currency = input.currency || "USD";
  let subtotalMinor = 0;
  let itemsCount = 0;
  let taxMinor = 0;

  for (const line of input.lines) {
    const modifiersMinor = (line.modifiers || []).reduce((acc, m) => acc + toMinor(m, currency), 0);
    const unitMinor = toMinor(line.unitPrice, currency) + modifiersMinor;
    const lineMinor = unitMinor * Math.max(1, Math.round(line.quantity));
    subtotalMinor += lineMinor;
    itemsCount += Math.max(1, Math.round(line.quantity));

    if (input.taxInclusive) {
      const rate = toNumber(line.taxRate) / 100;
      const included = rate > 0 ? Math.round((lineMinor * rate) / (1 + rate)) : 0;
      taxMinor += included;
    }
  }

  let discountMinor = 0;
  if (input.discountType === "PERCENTAGE") {
    const pct = Math.min(100, Math.max(0, toNumber(input.discount)));
    discountMinor = Math.round((subtotalMinor * pct) / 100);
  } else {
    discountMinor = Math.min(subtotalMinor, Math.max(0, toMinor(input.discount, currency)));
  }

  const taxableBaseMinor = Math.max(0, subtotalMinor - discountMinor);
  const serviceFeeMinor = Math.round((taxableBaseMinor * toNumber(input.serviceFeeRate)) / 100);
  const deliveryFeeMinor = toMinor(input.deliveryFee, currency);
  const tipMinor = toMinor(input.tip, currency);

  if (!input.taxInclusive) {
    // Tax is computed per line above only for inclusive mode; for exclusive
    // mode we apply each line's own rate to its discounted share.
    let exclusiveTax = 0;
    for (const line of input.lines) {
      const modifiersMinor = (line.modifiers || []).reduce((acc, m) => acc + toMinor(m, currency), 0);
      const lineMinor = (toMinor(line.unitPrice, currency) + modifiersMinor) * Math.max(1, Math.round(line.quantity));
      const share = subtotalMinor > 0 ? lineMinor / subtotalMinor : 0;
      const rate = toNumber(line.taxRate) / 100;
      exclusiveTax += Math.round(taxableBaseMinor * share * rate);
    }
    taxMinor = exclusiveTax;
  }

  const totalMinor = taxableBaseMinor + taxMinor + serviceFeeMinor + deliveryFeeMinor + tipMinor;

  return {
    subtotal: fromMinor(subtotalMinor, currency),
    discount: fromMinor(discountMinor, currency),
    taxableBase: fromMinor(taxableBaseMinor, currency),
    tax: fromMinor(taxMinor, currency),
    serviceFee: fromMinor(serviceFeeMinor, currency),
    deliveryFee: fromMinor(deliveryFeeMinor, currency),
    tip: fromMinor(tipMinor, currency),
    total: fromMinor(totalMinor, currency),
    itemsCount,
  };
}

/** Round a money amount to the currency's precision. */
export function roundMoney(value: MoneyInput, currency = "USD"): number {
  return fromMinor(toMinor(value, currency), currency);
}
