import test from "node:test";
import assert from "node:assert/strict";
import { safeAuditValue, sanitizeAuditValue } from "../src/lib/audit-sanitize";

test("redacts secrets recursively while preserving useful audit values", () => {
  const result = sanitizeAuditValue({
    status: "PAID",
    passwordHash: "hash-value",
    resetToken: "reset-value",
    nested: { apiKey: "key-value", cardNumber: "4111111111111111", amount: 12.5 },
  }) as Record<string, unknown>;

  assert.equal(result.status, "PAID");
  assert.equal(result.passwordHash, "[REDACTED]");
  assert.equal(result.resetToken, "[REDACTED]");
  assert.deepEqual(result.nested, { apiKey: "[REDACTED]", cardNumber: "[REDACTED]", amount: 12.5 });
});

test("converts dates and bigints, and safely represents cycles and binary values", () => {
  const shared: Record<string, unknown> = { at: new Date("2026-01-02T03:04:05.000Z"), count: 42n };
  shared.self = shared;
  const result = sanitizeAuditValue({ first: shared, second: shared, bytes: Buffer.from("secret") }) as Record<string, unknown>;
  const first = result.first as Record<string, unknown>;
  assert.equal(first.at, "2026-01-02T03:04:05.000Z");
  assert.equal(first.count, "42");
  assert.equal(first.self, "[CIRCULAR]");
  assert.equal(result.second, "[CIRCULAR]");
  assert.equal(result.bytes, "[BINARY OMITTED]");
});

test("bounds strings, object entries, array entries, depth, and total JSON size", () => {
  assert.equal((sanitizeAuditValue("x".repeat(20_000)) as string).length, 10_000);
  assert.equal((sanitizeAuditValue(Array.from({ length: 250 }, (_, index) => index)) as unknown[]).length, 200);
  let deepObject: unknown = { leaf: "x" };
  for (let index = 0; index < 9; index += 1) deepObject = { child: deepObject };
  const deep = sanitizeAuditValue(deepObject);
  assert.match(JSON.stringify(deep), /\[MAX DEPTH\]/);
  const oversized = safeAuditValue(Array.from({ length: 200 }, () => "x".repeat(10_000))) as { truncated?: boolean; preview?: string };
  assert.equal(oversized.truncated, true);
  assert.ok((oversized.preview?.length ?? Infinity) <= 39_000);
  assert.equal(safeAuditValue(undefined), undefined);
});
