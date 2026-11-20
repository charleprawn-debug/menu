import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { attributeSalesToPaymentMethod, buildXlsx, csvCell, derivePaymentStatus } from "@/lib/finance";

test("payment state is derived from net paid cents", () => {
  assert.equal(derivePaymentStatus(10000, 0, 0), "UNPAID");
  assert.equal(derivePaymentStatus(10000, 4000, 0), "PARTIALLY_PAID");
  assert.equal(derivePaymentStatus(10000, 10000, 0), "PAID");
  assert.equal(derivePaymentStatus(10000, 10000, 2500), "PARTIALLY_PAID");
  assert.equal(derivePaymentStatus(10000, 5000, 5000), "REFUNDED");
});

test("payment-method reports attribute only that method's share instead of duplicating the full order", () => {
  const cash = attributeSalesToPaymentMethod(10000, 1000, 800, 4000);
  const card = attributeSalesToPaymentMethod(10000, 1000, 800, 6000);
  assert.deepEqual(cash, { salesCents: 4000, discountCents: 400, taxCents: 320 });
  assert.deepEqual(card, { salesCents: 6000, discountCents: 600, taxCents: 480 });
  assert.equal(cash.salesCents + card.salesCents, 10000);
  assert.equal(cash.discountCents + card.discountCents, 1000);
  assert.equal(cash.taxCents + card.taxCents, 800);
});

test("CSV export quotes values and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell("=HYPERLINK(\"https://example.test\")"), `"'=HYPERLINK(""https://example.test"")"`);
  assert.equal(csvCell("ordinary, value"), `"ordinary, value"`);
  assert.equal(csvCell(123.45), `"123.45"`);
});

test("XLSX output is a valid zip workbook with formula-like input stored as text", async () => {
  const bytes = await buildXlsx(["Order", "Customer"], [[1042, "=1+1"]], "Sales report");
  const workbook = await JSZip.loadAsync(bytes);
  const sheet = await workbook.file("xl/worksheets/sheet1.xml")?.async("string");
  assert.ok(sheet);
  assert.match(sheet, /<v>1042<\/v>/);
  assert.match(sheet, /<t xml:space="preserve">=1\+1<\/t>/);
  assert.doesNotMatch(sheet, /<f>/);
});
