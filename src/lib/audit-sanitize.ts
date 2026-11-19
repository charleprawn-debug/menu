const secretKey = /(password|passwd|token|secret|authorization|cookie|api.?key|private.?key|card.?number|cvv|cvc|reset.?url)/i;

export function sanitizeAuditValue(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") return value ?? null;
  if (typeof value === "string") return value.slice(0, 10_000);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return "[OMITTED]";
  if (value instanceof Date) return value.toISOString();
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return "[BINARY OMITTED]";
  if (typeof value !== "object") return String(value);
  if (depth >= 8) return "[MAX DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitizeAuditValue(item, seen, depth + 1));
  if (value.constructor?.name === "Decimal") return String(value);
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 200)) {
    output[key] = secretKey.test(key) ? "[REDACTED]" : sanitizeAuditValue(item, seen, depth + 1);
  }
  return output;
}

export function safeAuditValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  const sanitized = sanitizeAuditValue(value);
  const serialized = JSON.stringify(sanitized);
  if (serialized && Buffer.byteLength(serialized, "utf8") > 40_000) {
    return { truncated: true, preview: serialized.slice(0, 39_000) };
  }
  return sanitized;
}
