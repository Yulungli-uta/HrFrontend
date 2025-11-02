// src/pages/FilesUploadPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import ReusableFileUpload from "@/components/ReusableFileUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DirectoryParametersAPI, FileManagementAPI, handleApiError, type ApiResponse } from "@/lib/api";
import { Download, Search } from "lucide-react";

type UploadedInfo = {
  // Ajusta según lo que devuelva tu backend al subir
  directoryCode?: string;
  relativePath?: string;
  fileName?: string;
  filePath?: string; // Ruta completa relativa si el backend la devuelve
  [key: string]: any;
};

const FilesUploadPage: React.FC = () => {
  const [directoryCode, setDirectoryCode] = useState("CONTRACTS"); // demo
  const [relativePath, setRelativePath] = useState("/contracts");
  const [dirInfo, setDirInfo] = useState<any | null>(null);
  const [lastUpload, setLastUpload] = useState<UploadedInfo | null>(null);
  const [existsResult, setExistsResult] = useState<string>("");
  const [loadingDir, setLoadingDir] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const filePathToCheck = useMemo(() => {
    if (!lastUpload?.filePath) {
      // Fallback si el backend no devuelve filePath
      const rel = (relativePath || "").replace(/\/+$/g, "");
      const name = lastUpload?.fileName || "";
      if (!rel || !name) return "";
      return `${rel}/${name}`;
    }
    return lastUpload.filePath;
  }, [lastUpload, relativePath]);

  // Carga info de directorio por code (opcional, para validar config)
  const fetchDirectory = async () => {
    if (!directoryCode.trim()) {
      setDirInfo(null);
      setMsg("Ingrese un código de directorio para buscar.");
      return;
    }
    setMsg("");
    setLoadingDir(true);
    const resp = await DirectoryParametersAPI.getByCode(directoryCode.trim());
    setLoadingDir(false);
    if (resp.status === "success") {
      setDirInfo(resp.data);
    } else {
      setDirInfo(null);
      setMsg(handleApiError(resp.error, "No se pudo obtener el directorio."));
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

  // Carga inicial de ejemplo
  useEffect(() => {
    fetchDirectory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parámetros del Directorio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
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
                  <Search className="h-4 w-4 mr-2" />
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

          {msg && <p className="text-sm text-destructive">{msg}</p>}

          {dirInfo ? (
            <div className="rounded-md border p-3 text-sm overflow-auto">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(dirInfo, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No hay datos del directorio aún.
            </p>
          )}
        </CardContent>
      </Card>

      <ReusableFileUpload
        directoryCode={directoryCode}
        relativePath={relativePath}
        accept=".pdf,.doc,.docx,image/*"
        maxSizeMB={20}
        label="Subir archivo al servidor"
        enableDropzone
        onUploaded={(data) => {
          // Guarda info devuelta por tu API
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones del archivo subido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lastUpload ? (
            <div className="rounded-md border p-3 text-sm overflow-auto">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(lastUpload, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aún no has subido ningún archivo.</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={checkExists} disabled={!lastUpload || checking}>
              {checking ? "Verificando..." : "Verificar existencia"}
            </Button>
            <Button type="button" onClick={downloadLast} disabled={!lastUpload || downloading}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Descargando..." : "Descargar último"}
            </Button>
          </div>

          {existsResult && <p className="text-sm">{existsResult}</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default FilesUploadPage;
