import assert from "node:assert/strict";
import test from "node:test";
import { defaultReportDateRange, formatReportDateInput, pageReportDateRange, parseReportDateRange } from "../src/lib/reports/date-range";
import { average, durationMinutes, roundTo } from "../src/lib/reports/metrics";

test("report date range treats the selected end day as inclusive", () => {
  const range = parseReportDateRange("2024-02-29", "2024-03-01");
  assert.ok(range);
  assert.equal(range.start.toISOString(), "2024-02-29T00:00:00.000Z");
  assert.equal(range.end.toISOString(), "2024-03-02T00:00:00.000Z");
});

test("report date range rejects impossible, reversed and overlong dates", () => {
  assert.equal(parseReportDateRange("2025-02-29", "2025-03-01"), null);
  assert.equal(parseReportDateRange("2026-05-03", "2026-05-02"), null);
  assert.equal(parseReportDateRange("2024-01-01", "2025-01-01"), null);
});

test("page report range falls back to current UTC month and flags invalid input", () => {
  const now = new Date("2025-12-18T20:30:00.000Z");
  const fallback = pageReportDateRange(undefined, undefined, now);
  assert.equal(fallback.invalid, false);
  assert.equal(formatReportDateInput(fallback.range.start), "2025-12-01");
  assert.equal(formatReportDateInput(fallback.range.end), "2026-01-01");
  assert.equal(pageReportDateRange("bad", "2025-12-31", now).invalid, true);
  assert.deepEqual(defaultReportDateRange(now), fallback.range);
});

test("preparation durations and averages ignore invalid values", () => {
  assert.equal(durationMinutes(new Date("2025-01-01T10:00:00Z"), new Date("2025-01-01T10:12:30Z")), 12.5);
  assert.equal(durationMinutes(new Date("2025-01-01T10:00:00Z"), new Date("2025-01-01T09:00:00Z")), null);
  assert.equal(average([10, 20, Number.NaN, -1]), 15);
  assert.equal(average([]), null);
  assert.equal(roundTo(12.36, 1), 12.4);
});
