// Versiones de un archivo dentro de una ranura de un registro (HR.tbl_StoredFileVersions).

export interface StoredFileVersion {
  versionId: number;
  versionNo: number;
  storedFileId: number;
  fileGuid: string;
  fileName: string | null;
  sizeBytes: number;
  isCurrent: boolean;
  uploadedBy: number | null;
  uploadedByName: string | null;
  uploadedAt: string;
  replacedBy: number | null;
  replacedByName: string | null;
  replacedAt: string | null;
  reason: string | null;
}

export interface ReplaceSignedDocumentRequest {
  storedFileId: number;
  /** Obligatorio cuando ya existe un documento firmado. */
  reason?: string | null;
}
