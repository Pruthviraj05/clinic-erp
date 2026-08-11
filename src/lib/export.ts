"use client";

/**
 * Export an array of flat records to a real .xlsx file (client-side download).
 * Used by the admin data tables. Keys become column headers.
 *
 * xlsx (~143 kB gzip) is loaded on demand inside the handler so it never rides
 * along in the route bundles that merely render a DataTable.
 */
export async function exportToExcel(
  rows: Record<string, unknown>[],
  fileName: string,
  sheetName = "Sheet1",
) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/** Escapes a value for a CSV cell — wraps in quotes whenever it contains a comma, quote or newline. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export an array of flat records to a real .csv file (client-side download). No dependency needed. */
export function exportToCsv(rows: Record<string, unknown>[], fileName: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
