export function ReportPrintStyles() {
  return <style>{`@media print { @page { margin: 12mm; } body * { visibility: hidden !important; } #report-print-area, #report-print-area * { visibility: visible !important; } #report-print-area { position: absolute; inset: 0; width: 100%; } }`}</style>;
}
