export function durationMinutes(start: Date | null | undefined, end: Date | null | undefined): number | null {
  if (!start || !end) return null;
  const milliseconds = end.getTime() - start.getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return null;
  return milliseconds / 60_000;
}

export function average(values: number[]): number | null {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function roundTo(value: number | null, decimals = 1): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}
