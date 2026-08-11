// src/pages/electronicSignature/ValidateCertificatePage.tsx
import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, UploadCloud, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { validateCertificate } from "@/lib/api";

interface CertificateValidationResult {
  subject: string;
  identification: string | null;
  issuer: string;
  validFrom: string;
  validUntil: string;
  isCurrentlyValid: boolean;
  serialNumber: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-EC", { dateStyle: "long" });
};

export default function ValidateCertificatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<CertificateValidationResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file || !password) return;
    setBusy(true);
    setError("");
    setResult(null);
    const r = await validateCertificate(file, password);
    // La contraseña ya cumplió su propósito en este request — se limpia del formulario de
    // inmediato, se haya podido validar o no, para no dejarla más tiempo del necesario en
    // memoria del navegador.
    setPassword("");
    setBusy(false);
    if (r.status === "success") {
      setResult(r.data as CertificateValidationResult);
    } else {
      setError(r.error.message);
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Validar firmas electrónicas</h1>
        <p className="text-sm text-muted-foreground">
          Sube tu certificado personal (.p12 o .pfx) para verificar su titular y vigencia.
        </p>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          Tu contraseña solo se usa para abrir el certificado en el momento de la validación — no se guarda ni se comparte.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label>Certificado (.p12 / .pfx) *</Label>
            <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 text-sm hover:bg-muted/40">
              <UploadCloud className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className={file ? "font-medium" : "text-muted-foreground"}>{file ? file.name : "Seleccionar archivo..."}</span>
              <input
                type="file"
                accept=".p12,.pfx,application/x-pkcs12"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div>
            <Label>Contraseña del certificado *</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button disabled={!file || !password || busy} onClick={submit} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {busy ? "Validando..." : "Validar certificado"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {result.subject}
              </CardTitle>
              <Badge variant={result.isCurrentlyValid ? "success" : "destructive"} className="flex items-center gap-1">
                {result.isCurrentlyValid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {result.isCurrentlyValid ? "Vigente" : "No vigente"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result.identification && (
              <p>
                <span className="text-muted-foreground">Cédula: </span>
                {result.identification}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Emitido por: </span>
              {result.issuer}
            </p>
            <p>
              <span className="text-muted-foreground">Vigencia: </span>
              {formatDate(result.validFrom)} – {formatDate(result.validUntil)}
            </p>
            <p className="break-all font-mono text-xs text-muted-foreground">Serial: {result.serialNumber}</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
