export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatExpedienteCode(instanceId: string | number): string {
  const id = String(instanceId);
  if (id.includes("-")) {
    return `EXP-${id.substring(0, 8).toUpperCase()}`;
  }
  return `EXP-${id.padStart(4, "0")}`;
}

export function getFileIcon(extension: string | null): string {
  if (!extension) return "file";
  const ext = extension.toLowerCase().replace(".", "");
  switch (ext) {
    case "pdf": return "pdf";
    case "doc": case "docx": return "doc";
    case "xls": case "xlsx": return "xls";
    case "jpg": case "jpeg": case "png": case "gif": return "image";
    default: return "file";
  }
}
