// src/components/ReusableMultipleFileUpload.tsx (VERSIÓN CORREGIDA)
import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { FileManagementAPI, handleApiError, type ApiResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Upload,
  X,
  File as FileIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileWithMeta {
  file: File;
  customName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  serverResponse?: any;
  previewUrl?: string;
}

type ReusableMultipleFileUploadProps = {
  directoryCode: string;
  relativePath?: string;
  accept?: string;
  maxSizeMB?: number;
  maxTotalSizeMB?: number;
  maxFiles?: number;
  disabled?: boolean;
  label?: string;
  className?: string;
  enableDropzone?: boolean;
  parallelUpload?: boolean;
  maxParallelUploads?: number;
  enablePdfPreview?: boolean;
  enableDownload?: boolean;

  onFileUploaded?: (serverResponse: any, file: File, customName: string) => void;
  onAllUploaded?: (responses: Array<{ serverResponse: any, file: File, customName: string }>) => void;
  onFileError?: (message: string, file: File, customName: string) => void;
  onProgress?: (progress: { uploaded: number; total: number; percentage: number }) => void;
};

function getSafeFilename(name: string) {
  return name.replace(/^\.?[/\\]+/, "").replace(/[/\\]+/g, "_").trim();
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function createObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export const ReusableMultipleFileUpload: React.FC<ReusableMultipleFileUploadProps> = ({
  directoryCode,
  relativePath,
  accept = "*/*",
  maxSizeMB = 20,
  maxTotalSizeMB,
  maxFiles,
  disabled,
  label = "Subir archivos",
  className,
  enableDropzone = true,
  parallelUpload = true,
  maxParallelUploads = 3,
  enablePdfPreview = true,
  enableDownload = true,
  onFileUploaded,
  onAllUploaded,
  onFileError,
  onProgress
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileWithMeta | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const sizeLimitBytes = useMemo(() => maxSizeMB * 1024 * 1024, [maxSizeMB]);
  const totalSizeLimitBytes = useMemo(() => maxTotalSizeMB ? maxTotalSizeMB * 1024 * 1024 : undefined, [maxTotalSizeMB]);

  // Limpiar URLs de objetos cuando el componente se desmonte
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [files]);

  const uploadStats = useMemo(() => {
    const total = files.length;
    const uploaded = files.filter(f => f.status === 'success').length;
    const errors = files.filter(f => f.status === 'error').length;
    const pending = files.filter(f => f.status === 'pending').length;
    const uploading = files.filter(f => f.status === 'uploading').length;
    
    return { total, uploaded, errors, pending, uploading, percentage: total > 0 ? (uploaded / total) * 100 : 0 };
  }, [files]);

  const pickFiles = () => inputRef.current?.click();

  const validateFiles = useCallback((newFiles: File[]): string | null => {
    // CORRECCIÓN: Validar que newFiles tenga elementos
    if (!newFiles || newFiles.length === 0) {
      return "No se seleccionaron archivos válidos.";
    }

    if (maxFiles && files.length + newFiles.length > maxFiles) {
      return `Máximo ${maxFiles} archivos permitidos.`;
    }

    for (const file of newFiles) {
      // CORRECCIÓN: Validar que file existe
      if (!file) {
        return "Uno o más archivos no son válidos.";
      }
      if (file.size > sizeLimitBytes) {
        return `El archivo "${file.name}" excede ${maxSizeMB} MB.`;
      }
    }

    if (totalSizeLimitBytes) {
      // CORRECCIÓN: Usar file.size directamente en lugar de f.file?.size
      const currentTotalSize = files.reduce((sum, f) => sum + f.file.size, 0);
      const newTotalSize = newFiles.reduce((sum, file) => sum + file.size, 0);
      if (currentTotalSize + newTotalSize > totalSizeLimitBytes) {
        return `El tamaño total excede ${maxTotalSizeMB} MB.`;
      }
    }

    return null;
  }, [files, maxFiles, sizeLimitBytes, maxSizeMB, totalSizeLimitBytes, maxTotalSizeMB]);

  const addFiles = useCallback((newFiles: File[]) => {
    // CORRECCIÓN: Filtrar archivos nulos o indefinidos
    const validFiles = newFiles.filter(file => file != null);
    if (validFiles.length === 0) {
      setErrorText("No se encontraron archivos válidos.");
      return;
    }

    const validationError = validateFiles(validFiles);
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    const newFilesWithMeta: FileWithMeta[] = validFiles.map(file => ({
      file,
      customName: getSafeFilename(file.name),
      status: 'pending',
      previewUrl: enablePdfPreview && isPdfFile(file) ? createObjectUrl(file) : undefined
    }));

    setFiles(prev => [...prev, ...newFilesWithMeta]);
    setErrorText(null);
  }, [validateFiles, enablePdfPreview]);

  const handleFileSelect: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  // Drag & Drop - CORREGIDO
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (!enableDropzone || disabled || isUploading) return;
    
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    // CORRECCIÓN: Filtrar archivos nulos
    const validFiles = droppedFiles.filter(file => file != null);
    if (validFiles.length > 0) {
      addFiles(validFiles);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!enableDropzone || disabled || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (!enableDropzone || disabled || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const fileToRemove = prev[index];
      if (fileToRemove.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateFileName = (index: number, newName: string) => {
    setFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, customName: getSafeFilename(newName) } : file
    ));
  };

  const clearAll = () => {
    files.forEach(file => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
    setFiles([]);
    setErrorText(null);
  };

  const handlePreview = (fileWithMeta: FileWithMeta) => {
    if (fileWithMeta.previewUrl) {
      setPreviewFile(fileWithMeta);
      setIsPreviewOpen(true);
    }
  };

  const handleDownload = async (fileWithMeta: FileWithMeta) => {
    if (fileWithMeta.status === 'success' && fileWithMeta.serverResponse) {
      try {
        const response = await FileManagementAPI.downloadFile(
          directoryCode,
          fileWithMeta.serverResponse.filePath || fileWithMeta.customName
        );
        
        if (response.status === "success") {
          const blob = response.data;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = fileWithMeta.customName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (error) {
        console.error('Error descargando archivo:', error);
        setErrorText("Error al descargar el archivo.");
      }
    } else {
      // Descargar archivo local
      const url = createObjectUrl(fileWithMeta.file);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileWithMeta.customName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const uploadSingleFile = async (fileWithMeta: FileWithMeta): Promise<ApiResponse<any>> => {
    const { file, customName } = fileWithMeta;
    
    const form = new FormData();
    form.append("DirectoryCode", directoryCode);
    if (relativePath) form.append("RelativePath", relativePath);
    const filename = getSafeFilename((customName || file.name).trim());
    if (filename) form.append("FileName", filename);
    form.append("File", file);

    return await FileManagementAPI.uploadFile(form);
  };

  const uploadAllFiles = async () => {
    if (!directoryCode?.trim()) {
      const msg = "Falta el DirectoryCode.";
      setErrorText(msg);
      return;
    }

    if (files.length === 0) {
      const msg = "No hay archivos para subir.";
      setErrorText(msg);
      return;
    }

    setIsUploading(true);
    setErrorText(null);

    setFiles(prev => prev.map(f => ({ ...f, status: 'pending', error: undefined })));

    try {
      if (parallelUpload) {
        await uploadParallel();
      } else {
        await uploadSequential();
      }

      const allSuccess = files.every(f => f.status === 'success');
      if (allSuccess && onAllUploaded) {
        const successfulUploads = files.map(f => ({
          serverResponse: f.serverResponse,
          file: f.file,
          customName: f.customName
        }));
        onAllUploaded(successfulUploads);
      }
    } catch (error) {
      const msg = "Error durante la subida de archivos.";
      setErrorText(msg);
    } finally {
      setIsUploading(false);
      onProgress?.({
        uploaded: uploadStats.uploaded,
        total: uploadStats.total,
        percentage: uploadStats.percentage
      });
    }
  };

  const uploadParallel = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    const batches = [];
    
    for (let i = 0; i < pendingFiles.length; i += maxParallelUploads) {
      batches.push(pendingFiles.slice(i, i + maxParallelUploads));
    }

    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(async (fileWithMeta) => {
          const fileIndex = files.findIndex(f => f.file === fileWithMeta.file);
          if (fileIndex === -1) return;

          setFiles(prev => prev.map((f, i) => 
            i === fileIndex ? { ...f, status: 'uploading' } : f
          ));

          try {
            const response = await uploadSingleFile(fileWithMeta);
            
            if (response.status === "success") {
              setFiles(prev => prev.map((f, i) => 
                i === fileIndex ? { 
                  ...f, 
                  status: 'success', 
                  serverResponse: response.data,
                } : f
              ));
              onFileUploaded?.(response.data, fileWithMeta.file, fileWithMeta.customName);
            } else {
              const errorMsg = handleApiError(response.error, "No se pudo subir el archivo.");
              setFiles(prev => prev.map((f, i) => 
                i === fileIndex ? { ...f, status: 'error', error: errorMsg } : f
              ));
              onFileError?.(errorMsg, fileWithMeta.file, fileWithMeta.customName);
            }
          } catch (error: any) {
            const errorMsg = error?.message ?? "Error de red";
            setFiles(prev => prev.map((f, i) => 
              i === fileIndex ? { ...f, status: 'error', error: errorMsg } : f
            ));
            onFileError?.(errorMsg, fileWithMeta.file, fileWithMeta.customName);
          }
        })
      );
    }
  };

  const uploadSequential = async () => {
    for (let i = 0; i < files.length; i++) {
      const fileWithMeta = files[i];
      
      setFiles(prev => prev.map((f, index) => 
        index === i ? { ...f, status: 'uploading' } : f
      ));

      try {
        const response = await uploadSingleFile(fileWithMeta);
        
        if (response.status === "success") {
          setFiles(prev => prev.map((f, index) => 
            index === i ? { 
              ...f, 
              status: 'success', 
              serverResponse: response.data 
            } : f
          ));
          onFileUploaded?.(response.data, fileWithMeta.file, fileWithMeta.customName);
        } else {
          const errorMsg = handleApiError(response.error, "No se pudo subir el archivo.");
          setFiles(prev => prev.map((f, index) => 
            index === i ? { ...f, status: 'error', error: errorMsg } : f
          ));
          onFileError?.(errorMsg, fileWithMeta.file, fileWithMeta.customName);
        }
      } catch (error: any) {
        const errorMsg = error?.message ?? "Error de red";
        setFiles(prev => prev.map((f, index) => 
          index === i ? { ...f, status: 'error', error: errorMsg } : f
        ));
        onFileError?.(errorMsg, fileWithMeta.file, fileWithMeta.customName);
      }

      onProgress?.({
        uploaded: i + 1,
        total: files.length,
        percentage: ((i + 1) / files.length) * 100
      });
    }
  };

  const getStatusIcon = (status: FileWithMeta['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <FileIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canPreview = (fileWithMeta: FileWithMeta) => {
    return enablePdfPreview && isPdfFile(fileWithMeta.file) && fileWithMeta.previewUrl;
  };

  return (
    <>
      <Card className={`w-full ${className ?? ""}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex justify-between items-center">
            <span>{label}</span>
            {files.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {uploadStats.uploaded}/{files.length} subidos
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
            multiple
          />

          {/* Zona selección/drag — responsive */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            role={enableDropzone ? "button" : undefined}
            aria-disabled={disabled || isUploading}
            tabIndex={enableDropzone ? 0 : -1}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && enableDropzone && !disabled && !isUploading) {
                pickFiles();
              }
            }}
            className={[
              "rounded-xl border p-4 sm:p-5",
              "flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4",
              dragOver ? "border-dashed ring-2 ring-offset-2" : "border-dashed",
              disabled ? "opacity-60 pointer-events-none" : "cursor-pointer",
            ].join(" ")}
            onClick={() => !disabled && !isUploading && pickFiles()}
          >
            <div className="shrink-0">
              <Upload className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                {enableDropzone ? (
                  <>
                    Arrastra y suelta tus archivos aquí o{" "}
                    <span className="underline">haz clic para seleccionar</span>.
                  </>
                ) : (
                  <>Haz clic para seleccionar archivos.</>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tipos permitidos: <code>{accept}</code> · Máx por archivo: {maxSizeMB} MB
                {maxFiles && ` · Máx archivos: ${maxFiles}`}
                {maxTotalSizeMB && ` · Máx total: ${maxTotalSizeMB} MB`}
              </p>
            </div>
          </div>

          {/* Barra de progreso general */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progreso general</span>
                <span>{Math.round(uploadStats.percentage)}%</span>
              </div>
              <Progress value={uploadStats.percentage} className="h-2" />
            </div>
          )}

          {/* Lista de archivos */}
          {files.length > 0 && (
            <div className="space-y-3">
              <Label>Archivos seleccionados ({files.length})</Label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {files.map((fileWithMeta, index) => (
                  <div
                    key={`${fileWithMeta.file.name}-${index}`}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    {getStatusIcon(fileWithMeta.status)}
                    
                    <div className="flex-1 min-w-0">
                      <Input
                        value={fileWithMeta.customName}
                        onChange={(e) => updateFileName(index, e.target.value)}
                        placeholder="Nombre del archivo"
                        disabled={disabled || isUploading || fileWithMeta.status === 'uploading'}
                        className="h-8 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Original: {fileWithMeta.file.name} · {formatFileSize(fileWithMeta.file.size)}
                        {isPdfFile(fileWithMeta.file) && " · PDF"}
                      </p>
                      {fileWithMeta.error && (
                        <p className="text-xs text-destructive mt-1">{fileWithMeta.error}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        {/* Botón de previsualización */}
                        {canPreview(fileWithMeta) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePreview(fileWithMeta)}
                                disabled={disabled || isUploading || fileWithMeta.status === 'uploading'}
                                aria-label="Vista previa"
                                className="h-8 w-8"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Vista previa</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Botón de descarga */}
                        {enableDownload && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(fileWithMeta)}
                                disabled={disabled || fileWithMeta.status === 'uploading'}
                                aria-label="Descargar"
                                className="h-8 w-8"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Descargar</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Botón de eliminar */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(index)}
                              disabled={disabled || isUploading || fileWithMeta.status === 'uploading'}
                              aria-label="Quitar archivo"
                              className="h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Eliminar</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info ruta */}
          {(relativePath || directoryCode) && (
            <p className="text-xs text-muted-foreground break-words">
              Se guardarán en <code>{relativePath || "/"}</code> dentro de{" "}
              <code>{directoryCode}</code>.
            </p>
          )}

          {/* Errores */}
          {errorText && (
            <p className="text-sm text-destructive">{errorText}</p>
          )}

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={clearAll}
              disabled={disabled || isUploading || files.length === 0}
            >
              Limpiar todo
            </Button>
            <Button
              type="button"
              onClick={uploadAllFiles}
              disabled={disabled || isUploading || files.length === 0 || !directoryCode}
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? `Subiendo... (${uploadStats.uploaded}/${files.length})` : `Subir ${files.length} archivo${files.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de previsualización de PDF */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileIcon className="h-5 w-5" />
              Vista previa: {previewFile?.customName}
            </DialogTitle>
            <DialogDescription>
              {previewFile?.file && `Tamaño: ${formatFileSize(previewFile.file.size)}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 border rounded-lg">
            {previewFile?.previewUrl && (
              <iframe
                src={previewFile.previewUrl}
                className="w-full h-full"
                title={`Vista previa de ${previewFile.customName}`}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {enableDownload && previewFile && (
              <Button
                variant="outline"
                onClick={() => {
                  handleDownload(previewFile);
                  setIsPreviewOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar
              </Button>
            )}
            <Button
              onClick={() => setIsPreviewOpen(false)}
              className="flex items-center gap-2"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReusableMultipleFileUpload;