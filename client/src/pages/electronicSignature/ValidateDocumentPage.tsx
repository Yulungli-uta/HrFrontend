// src/pages/electronicSignature/ValidateDocumentPage.tsx
import { useState } from "react";
import { CheckCircle2, Eye, Loader2, ShieldCheck, TriangleAlert, UploadCloud, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { validateSignedDocument } from "@/lib/api";

interface ValidatedSigner {
  fullName: string;
  identification: string;
  signedAt?: string | null;
  signatureStatus: string;
  issuer?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  revocationStatus: string;
}

interface DocumentValidationResult {
  status: string;
  isSigned: boolean;
  isIntegrityValid: boolean;
  sha256: string;
  signatureCount: number;
  signers: ValidatedSigner[];
  warnings: string[];
}

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" });
};

export default function ValidateDocumentPage() {
  const [result, setResult] = useState<DocumentValidationResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(URL.createObjectURL(file));
    setBusy(true);
    setError("");
    setResult(null);
    const r = await validateSignedDocument(file);
    setBusy(false);
    if (r.status === "success") {
      setResult(r.data as DocumentValidationResult);
    } else {
      setError(r.error.message);
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Validar documento firmado</h1>
        <p className="text-sm text-muted-foreground">
          Sube un PDF firmado electrónicamente para verificar su integridad y quiénes lo firmaron.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center hover:bg-muted/40">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <span className={fileName ? "font-medium" : "text-muted-foreground"}>
              {fileName || "Seleccionar archivo PDF..."}
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
        </CardContent>
      </Card>

      {busy && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validando documento...
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Resultado de validación
              </CardTitle>
              <Badge variant={result.isSigned && result.isIntegrityValid ? "success" : "destructive"} className="flex items-center gap-1">
                {result.isSigned && result.isIntegrityValid ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {result.status}
              </Badge>
            </div>
            <CardDescription className="break-all font-mono text-xs">SHA-256: {result.sha256}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fileUrl && (
              <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, "_blank")}>
                <Eye className="mr-2 h-4 w-4" />
                Ver documento
              </Button>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1">
                {result.isIntegrityValid ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                Integridad {result.isIntegrityValid ? "válida" : "comprometida"}
              </span>
              <span>{result.signatureCount} firma(s) encontrada(s)</span>
            </div>

            {result.warnings.length > 0 && (
              <Alert>
                <TriangleAlert className="h-4 w-4" />
                <AlertDescription>{result.warnings.join(" · ")}</AlertDescription>
              </Alert>
            )}

            {result.signers.length > 0 && (
              <ul className="space-y-2">
                {result.signers.map((signer, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">{initials(signer.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{signer.fullName}</p>
                        <p className="text-xs text-muted-foreground">{signer.identification}</p>
                        {formatDate(signer.signedAt) && (
                          <p className="text-xs text-muted-foreground">Firmado el {formatDate(signer.signedAt)}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={signer.revocationStatus?.toUpperCase() === "VALID" ? "success" : "outline"}>
                      {signer.signatureStatus}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
