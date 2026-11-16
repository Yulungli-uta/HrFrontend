import type { ApiResponse, PagedResult } from "@/lib/api";

/** Convierte los items de una página del servidor al tipo normalizado de la pantalla. */
export function mapPagedItems<TRaw, TOut>(
  res: ApiResponse<PagedResult<TRaw>>,
  normalize: (raw: TRaw) => TOut,
): ApiResponse<PagedResult<TOut>> {
  if (res.status !== "success") return res as unknown as ApiResponse<PagedResult<TOut>>;
  return { ...res, data: { ...res.data, items: res.data.items.map(normalize) } };
}
