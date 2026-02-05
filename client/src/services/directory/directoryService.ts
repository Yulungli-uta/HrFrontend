// src/services/directoryService/directoryService.ts
import { DirectoryParametersAPI } from "@/lib/api";
import type { DirectoryParameter } from "@/types/directoryParameter";

export type NormalizedDirectoryParams = {
  accept: string;        // para input file accept
  maxSizeMB: number;     // normalizado en MB
  relativePath: string;
};

function toAcceptFromExtension(ext?: string): string {
  // ext suele venir tipo ".pdf,.jpg,.png" o "pdf,jpg"
  if (!ext) return "*/*";
  const parts = ext
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => (s.startsWith(".") ? s : `.${s}`));
  return parts.length ? parts.join(",") : "*/*";
}

export const directoryService = {
  async getByCode(code: string) {
    return DirectoryParametersAPI.getByCode(code);
  },

  normalize(param?: DirectoryParameter | null): NormalizedDirectoryParams {
    const accept = toAcceptFromExtension(param?.extension);
    const maxSizeMB =
      Number.isFinite(Number(param?.maxSizeMb)) ? Number(param?.maxSizeMb) : 20;

    return {
      accept,
      maxSizeMB,
      relativePath: param?.relativePath ?? "",
    };
  },
};
