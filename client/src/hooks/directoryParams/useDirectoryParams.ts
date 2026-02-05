// src/hooks/directoryParams/useDirectoryParams.ts

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/lib/api";
import type { DirectoryParameter } from "@/types/directoryParameter";
import { directoryService } from "@/services/directory/directoryService";

export function useDirectoryParams(directoryCode: string) {
  const q = useQuery<ApiResponse<DirectoryParameter>>({
    queryKey: ["dirParam", directoryCode],
    queryFn: () => directoryService.getByCode(directoryCode),
  });

  const param = q.data?.status === "success" ? q.data.data : null;
  const normalized = directoryService.normalize(param);

  return {
    ...q,
    directory: param,
    params: normalized, // { accept, maxSizeMB, relativePath }
  };
}
