import JSZip from "jszip";

export type DerivedPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "REFUNDED";

/** Derive the order payment state from cents to avoid floating-point rounding. */
export function derivePaymentStatus(totalCents: number, grossPaidCents: number, refundedCents: number): DerivedPaymentStatus {
  const total = Math.max(0, Math.trunc(totalCents));
  const gross = Math.max(0, Math.trunc(grossPaidCents));
  const refunded = Math.max(0, Math.trunc(refundedCents));
  const netPaid = Math.max(0, gross - refunded);
  if (netPaid === 0) return gross > 0 && refunded > 0 ? "REFUNDED" : "UNPAID";
  if (netPaid >= total) return "PAID";
  return "PARTIALLY_PAID";
}

/** Allocate a completed order's sales metrics to one payment method without duplicating the full order total. */
export function attributeSalesToPaymentMethod(orderTotalCents: number, discountCents: number, taxCents: number, methodPaidCents: number) {
  const total = Math.max(0, Math.trunc(orderTotalCents));
  const payment = Math.max(0, Math.trunc(methodPaidCents));
  const shareCents = total > 0 ? Math.min(payment, total) : 0;
  return {
    salesCents: payment,
    discountCents: total > 0 ? Math.round(Math.max(0, discountCents) * shareCents / total) : 0,
    taxCents: total > 0 ? Math.round(Math.max(0, taxCents) * shareCents / total) : 0,
  };
}

/** CSV cell encoder resistant to spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\u0000-\u0020]*[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/** Build a minimal valid XLSX workbook with inline strings and no formulas. */
export async function buildXlsx(headers: string[], rows: Array<Array<string | number | null>>, sheetName = "Report"): Promise<Uint8Array> {
  const safeSheetName = sheetName.replace(/[\\/*?:\[\]]/g, " ").slice(0, 31) || "Report";
  const allRows: Array<Array<string | number | null>> = [headers, ...rows];
  if (allRows.length > 100_000) throw new Error("XLSX_ROW_LIMIT");
  const sheetRows = allRows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
      const text = value == null ? "" : String(value);
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(safeSheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
