/*
 * CSV serialisation for register exports. Councils open these in Excel, so:
 * a UTF-8 BOM is prepended (Excel misreads unmarked UTF-8), and every field
 * containing commas, quotes or newlines is quoted per RFC 4180
 * (conditions_limitations routinely contains both).
 */

const BOM = "\uFEFF";

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => unknown;
};

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => escapeField(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeField(c.value(row))).join(","));
  }
  return BOM + lines.join("\r\n") + "\r\n";
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
