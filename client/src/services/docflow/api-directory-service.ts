import type {
  DirectoryParameter,
  DirectoryType,
  DirectoryFilter,
  IDirectoryParametersService,
} from "@/types/docflow/directory.types";
import { DocflowAPI } from "@/lib/docflow/docflow-api";
import { logger } from "@/lib/logger";

export class ApiDirectoryParametersService implements IDirectoryParametersService {
  private cache: Map<string, DirectoryParameter[]> = new Map();
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  get initialized(): boolean {
    return this._initialized;
  }

  async init(): Promise<void> {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._loadInitialData();
    await this._initPromise;
  }

  private async _loadInitialData(): Promise<void> {
    const types: DirectoryType[] = [
      "document_type",
      "instance_statuses",
      "movement_types",
      "areas",
      "priorities",
      "users",
      // "processes",
    ];

    try {
      logger.info("ApiDirectoryService", "Cargando catalogos desde API...");

      const results = await Promise.all(
        types.map((type) =>
          DocflowAPI.directory
            .getParameters(type)
            .then((response) => {
              let params: DirectoryParameter[];
              if (response && typeof response === "object" && "data" in response && Array.isArray(response.data)) {
                params = response.data;
              } else if (Array.isArray(response)) {
                params = response as unknown as DirectoryParameter[];
              } else {
                params = [];
              }
              return { type, params };
            })
            .catch(() => ({ type, params: [] as DirectoryParameter[] }))
        )
      );

      for (const { type, params } of results) {
        this.cache.set(type, params);
      }

      this._initialized = true;
      logger.info("ApiDirectoryService", `Catalogos cargados: ${types.length} tipos`);
    } catch (error) {
      logger.error("ApiDirectoryService", "Error en carga de catalogos:", error);
      this._initialized = true;
    }
  }

  getParameters(type: DirectoryType, filter?: DirectoryFilter): DirectoryParameter[] {
    const params = this.cache.get(type) || [];
    let result = [...params];

    if (filter?.isActive !== undefined) {
      result = result.filter((p) => p.isActive === filter.isActive);
    }

    if (filter?.parentId !== undefined) {
      result = result.filter((p) => p.parentId === filter.parentId);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getParameterById(type: DirectoryType, id: number | string): DirectoryParameter | undefined {
    const params = this.cache.get(type) || [];
    return params.find((p) => p.id === id);
  }

  getParameterByCode(type: DirectoryType, code: string): DirectoryParameter | undefined {
    const params = this.cache.get(type) || [];
    return params.find((p) => p.code === code);
  }
}
