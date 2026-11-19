import assert from "node:assert/strict";
import test from "node:test";
import { parseCsvRecords } from "../src/lib/csv";

test("parses quoted commas, escaped quotes, CRLF, and a UTF-8 BOM", () => {
  const rows = parseCsvRecords('\uFEFFnameAr,descriptionAr,price\r\n"وجبة، خاصة","قال ""أهلاً""",12.5\r\n');
  assert.deepEqual(rows, [
    ["\uFEFFnameAr", "descriptionAr", "price"],
    ["وجبة، خاصة", 'قال "أهلاً"', "12.5"],
  ]);
});

test("preserves line breaks inside quoted cells", () => {
  assert.deepEqual(parseCsvRecords('nameAr,price\n"سطر أول\nسطر ثانٍ",10'), [
    ["nameAr", "price"],
    ["سطر أول\nسطر ثانٍ", "10"],
  ]);
});

test("rejects unterminated quotes and quote characters embedded in unquoted fields", () => {
  assert.throws(() => parseCsvRecords('nameAr,price\n"صنف,10'), /INVALID_CSV/);
  assert.throws(() => parseCsvRecords('nameAr,price\nوجبة"خاصة,10'), /INVALID_CSV/);
});
