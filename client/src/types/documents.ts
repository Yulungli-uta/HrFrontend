//src/types/documents.ts
// ✅ StoredFile DTO (lo que devuelve tu backend desde la tabla)
export interface StoredFileDto {
  fileId: number;
  fileGuid: string;
  directoryCode: string;
  entityType: string;
  entityId: string;
  uploadYear: number;
  relativeFolder: string;
  storedFileName: string;
  originalFileName?: string | null;
  documentTypeId?: number | null;
  extension?: string | null;
  contentType?: string | null;
  sizeBytes: number;
  status: number;
  createdAt: string;
}

// ✅ Respuesta del orquestador al subir múltiples
export interface DocumentUploadItemResultDto {
  success: boolean;
  message: string;
  originalFileName: string;
  sizeBytes: number;
  storedFile?: StoredFileDto;
}

export interface DocumentUploadResultDto {
  success: boolean;
  message: string;
  total: number;
  uploaded: number;
  failed: number;
  items: DocumentUploadItemResultDto[];
}

export interface UploadSingleArgs  {
  directoryCode: string;
  entityType: string;
  entityId: string;
  relativePath: string;
  file: File;
  documentTypeId: string;
};

export interface UploadMappedItem  {
  file: File;
  documentTypeId: string;
};

export interface UploadMappedArgs  {
  directoryCode: string;
  entityType: string;
  entityId: string | number;
  relativePath?: string;
  items: UploadMappedItem[];
};
