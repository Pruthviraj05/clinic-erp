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
