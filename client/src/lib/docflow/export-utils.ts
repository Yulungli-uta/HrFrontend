export interface ExportColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  formatter?: (value: unknown, row: T) => string;
}

export type ExportValueType = "string" | "number" | "date" | "datetime" | "boolean";

export function formatValueForExport(value: unknown, type: ExportValueType = "string"): string {
  if (value === null || value === undefined) return "";

  switch (type) {
    case "number":
      return String(Number(value));
    case "date": {
      const d = new Date(String(value));
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" });
    }
    case "datetime": {
      const dt = new Date(String(value));
      if (isNaN(dt.getTime())) return String(value);
      return dt.toLocaleString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    case "boolean":
      return value ? "Sí" : "No";
    case "string":
    default:
      return String(value);
  }
}

function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n") || field.includes("\r")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const headerRow = columns.map((col) => escapeCSVField(col.label)).join(",");

  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const rawValue = getNestedValue(row, col.key);
        const formatted = col.formatter ? col.formatter(rawValue, row) : String(rawValue ?? "");
        return escapeCSVField(formatted);
      })
      .join(",")
  );

  const csvContent = [headerRow, ...dataRows].join("\r\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
