// src/pages/FilesUploadPage.tsx (VERSIÓN MEJORADA)
import React, { useEffect, useMemo, useState } from "react";
import ReusableFileUpload from "@/components/ReusableFileUpload";
import ReusableMultipleFileUpload from "@/components/MultiFileUploadTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DirectoryParametersAPI, FileManagementAPI, handleApiError, type ApiResponse } from "@/lib/api";
import { Download, Search, FileText, Files, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UploadedInfo = {
  directoryCode?: string;
  relativePath?: string;
  fileName?: string;
  filePath?: string;
  [key: string]: any;
};

type MultipleUploadedInfo = {
  files: Array<{
    serverResponse: any;
    file: File;
    customName: string;
  }>;
  timestamp: Date;
};

const FilesUploadPage: React.FC = () => {
  const [directoryCode, setDirectoryCode] = useState("HRCONTRACT");
  const [relativePath, setRelativePath] = useState("/contracts");
  const [dirInfo, setDirInfo] = useState<any | null>(null);
  const [lastUpload, setLastUpload] = useState<UploadedInfo | null>(null);
  const [multipleUploads, setMultipleUploads] = useState<MultipleUploadedInfo[]>([]);
  const [existsResult, setExistsResult] = useState<string>("");
  const [loadingDir, setLoadingDir] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [activeTab, setActiveTab] = useState("single");
  const [directoryError, setDirectoryError] = useState<string>("");

  const filePathToCheck = useMemo(() => {
    if (!lastUpload?.filePath) {
      const rel = (relativePath || "").replace(/\/+$/g, "");
      const name = lastUpload?.fileName || "";
      if (!rel || !name) return "";
      return `${rel}/${name}`;
    }
    return lastUpload.filePath;
  }, [lastUpload, relativePath]);

  // Carga info de directorio por code
  const fetchDirectory = async () => {
    if (!directoryCode.trim()) {
      setDirInfo(null);
      setDirectoryError("Ingrese un código de directorio para buscar.");
      return;
    }
    setDirectoryError("");
    setMsg("");
    setLoadingDir(true);
    try {
      const resp = await DirectoryParametersAPI.getByCode(directoryCode.trim());
      if (resp.status === "success") {
        setDirInfo(resp.data);
        setDirectoryError("");
      } else {
        setDirInfo(null);
        // Manejar específicamente el error 404
        if (resp.error?.code === 404) {
          setDirectoryError(`El directorio "${directoryCode}" no existe en el sistema.`);
        } else {
          setDirectoryError(handleApiError(resp.error, "No se pudo obtener el directorio."));
        }
      }
    } catch (error) {
      setDirInfo(null);
      setDirectoryError("Error de conexión al buscar el directorio.");
    } finally {
      setLoadingDir(false);
    }
  };

  // Chequear existencia del último archivo subido
  const checkExists = async () => {
    if (!directoryCode || !filePathToCheck) {
      setExistsResult("Faltan datos para verificar.");
      return;
    }
    setChecking(true);
    const resp = await FileManagementAPI.fileExists(directoryCode, filePathToCheck);
    setChecking(false);
    if (resp.status === "success") {
      setExistsResult(resp.data ? "El archivo SÍ existe." : "El archivo NO existe.");
    } else {
      setExistsResult(handleApiError(resp.error, "No se pudo verificar la existencia."));
    }
  };

  // Descargar último archivo subido
  const downloadLast = async () => {
    if (!directoryCode || !filePathToCheck) {
      setMsg("No hay archivo para descargar.");
      return;
    }
    setDownloading(true);
    const resp = await FileManagementAPI.downloadFile(directoryCode, filePathToCheck);
    setDownloading(false);
    if (resp.status === "success") {
      const blob = resp.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = lastUpload?.fileName || "archivo";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } else {
      setMsg(handleApiError(resp.error, "No se pudo descargar el archivo."));
    }
  };

  // Manejar subida múltiple exitosa
  const handleMultipleUploaded = (responses: Array<{ serverResponse: any, file: File, customName: string }>) => {
    const newUpload: MultipleUploadedInfo = {
      files: responses,
      timestamp: new Date()
    };
    setMultipleUploads(prev => [newUpload, ...prev.slice(0, 4)]); // Mantener solo los últimos 5
    setMsg(`¡Éxito! Se subieron ${responses.length} archivos correctamente.`);
  };

  // Manejar progreso de subida múltiple
  const handleMultipleProgress = (progress: { uploaded: number; total: number; percentage: number }) => {
    console.log(`Progreso: ${progress.uploaded}/${progress.total} (${Math.round(progress.percentage)}%)`);
  };

  // Carga inicial de ejemplo
  useEffect(() => {
    fetchDirectory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Sistema de Gestión de Archivos</h1>
        <p className="text-muted-foreground">
          Sube y gestiona tus archivos de manera individual o múltiple
        </p>
      </div>

      {/* Configuración común */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Configuración del Directorio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="directoryCode">DirectoryCode</Label>
              <div className="flex gap-2">
                <Input
                  id="directoryCode"
                  value={directoryCode}
                  onChange={(e) => setDirectoryCode(e.target.value)}
                  placeholder="Ej: CONTRACTS"
                />
                <Button type="button" onClick={fetchDirectory} disabled={loadingDir}>
                  {loadingDir ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="relativePath">RelativePath (opcional)</Label>
              <Input
                id="relativePath"
                value={relativePath}
                onChange={(e) => setRelativePath(e.target.value)}
                placeholder="/contracts"
              />
            </div>
          </div>

          {directoryError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{directoryError}</AlertDescription>
            </Alert>
          )}

          {msg && (
            <div className={`p-3 rounded-md text-sm ${
              msg.includes("Éxito") || msg.includes("correctamente") 
                ? "bg-green-50 text-green-800 border border-green-200" 
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              {msg}
            </div>
          )}

          {dirInfo ? (
            <div className="rounded-md border p-3 text-sm overflow-auto">
              <Label className="text-xs font-medium mb-2 block">Información del Directorio:</Label>
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(dirInfo, null, 2)}
              </pre>
            </div>
          ) : (
            !directoryError && (
              <p className="text-xs text-muted-foreground">
                No hay datos del directorio aún.
              </p>
            )
          )}
        </CardContent>
      </Card>

      {/* Tabs para subida individual vs múltiple */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Subida Individual
          </TabsTrigger>
          <TabsTrigger value="multiple" className="flex items-center gap-2">
            <Files className="h-4 w-4" />
            Subida Múltiple
          </TabsTrigger>
        </TabsList>

        {/* Tab de subida individual */}
        <TabsContent value="single" className="space-y-6">
          <ReusableFileUpload
            directoryCode={directoryCode}
            relativePath={relativePath}
            accept=".pdf,.doc,.docx,image/*"
            maxSizeMB={20}
            label="Subir archivo individual"
            enableDropzone
            onUploaded={(data) => {
              const info: UploadedInfo = {
                directoryCode,
                relativePath,
                fileName: data?.fileName || data?.name || data?.FileName,
                filePath: data?.filePath || data?.relativePath || data?.RelativePath
              };
              setLastUpload(info);
              setMsg("Archivo subido correctamente.");
            }}
            onError={(message) => setMsg(message)}
          />

          {lastUpload && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Archivo Subido (Individual)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border p-3 text-sm overflow-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(lastUpload, null, 2)}
                  </pre>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button type="button" variant="secondary" onClick={checkExists} disabled={!lastUpload || checking}>
                    {checking ? "Verificando..." : "Verificar existencia"}
                  </Button>
                  <Button type="button" onClick={downloadLast} disabled={!lastUpload || downloading}>
                    <Download className="h-4 w-4 mr-2" />
                    {downloading ? "Descargando..." : "Descargar último"}
                  </Button>
                </div>

                {existsResult && (
                  <div className="p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-sm">
                    {existsResult}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab de subida múltiple */}
        <TabsContent value="multiple" className="space-y-6">
          <ReusableMultipleFileUpload
            directoryCode={directoryCode}
            relativePath={relativePath}
            accept=".pdf,.doc,.docx,image/*"
            maxSizeMB={20}
            maxFiles={10}
            maxTotalSizeMB={100}
            label="Subir múltiples archivos"
            enableDropzone
            enablePdfPreview={true}
            enableDownload={true}
            parallelUpload={true}
            maxParallelUploads={3}
            onAllUploaded={handleMultipleUploaded}
            onFileUploaded={(serverResponse, file, customName) => {
              console.log(`Archivo subido: ${customName}`, serverResponse);
            }}
            onFileError={(message, file, customName) => {
              console.error(`Error en ${customName}:`, message);
            }}
            onProgress={handleMultipleProgress}
          />

          {/* Historial de subidas múltiples */}
          {multipleUploads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Files className="h-5 w-5" />
                  Historial de Subidas Múltiples
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {multipleUploads.map((uploadGroup, groupIndex) => (
                  <div key={groupIndex} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Lote #{multipleUploads.length - groupIndex} - {uploadGroup.files.length} archivos
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {uploadGroup.timestamp.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="grid gap-2">
                      {uploadGroup.files.map((fileInfo, fileIndex) => (
                        <div key={fileIndex} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate">{fileInfo.customName}</span>
                            <span className="text-xs text-muted-foreground">
                              ({Math.round(fileInfo.file.size / 1024)} KB)
                            </span>
                          </div>
                          
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Subido correctamente
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Estadísticas rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                {lastUpload ? 1 : 0}
              </div>
              <div className="text-sm text-muted-foreground">Archivos individuales</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {multipleUploads.reduce((total, group) => total + group.files.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Archivos múltiples</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">
                {multipleUploads.length}
              </div>
              <div className="text-sm text-muted-foreground">Lotes subidos</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FilesUploadPage;