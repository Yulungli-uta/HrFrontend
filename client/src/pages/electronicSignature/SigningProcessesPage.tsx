// src/pages/electronicSignature/SigningProcessesPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, FileText, Search, Eye, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/ui/DataPagination";
import { SignatureProcessesAPI } from "@/lib/api";
import { getProcessStatusMeta } from "@/features/electronicSignature/signatureStatus";
import { useSignatureListFilters } from "@/hooks/electronicSignature/useSignatureListFilters";
import type { SigningProcessListItem } from "@/types/electronic-signature";

const COMPLETED_STATUSES = new Set(["COMPLETED"]);

export default function SigningProcessesPage() {
  const [location] = useLocation();
  const showAll = location === "/signatures/processes/all";
  const { data, isLoading, isError } = useQuery({
    queryKey: [showAll ? "signature-processes-all" : "signature-processes"],
    queryFn: () => showAll ? SignatureProcessesAPI.listAll() : SignatureProcessesAPI.list(),
    refetchOnWindowFocus: true,
  });

  const rows: SigningProcessListItem[] = data?.status === "success" ? data.data : [];
  const errorMessage = data?.status === "error" ? data.error.message : isError ? "No se pudieron cargar los procesos." : null;

  const f = useSignatureListFilters(rows, (row) => getProcessStatusMeta(row.status).label);

  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const handleViewDocument = async (processId: number) => {
    setPreviewingId(processId);
    try {
      const docsRes = await SignatureProcessesAPI.documents(processId);
      if (docsRes.status === "error") return;
      const doc = docsRes.data[0];
      const version = doc?.versions[doc.versions.length - 1];
      if (!version) return;
      const blobRes = await SignatureProcessesAPI.downloadVersion(version.versionId);
      if (blobRes.status === "success") window.open(URL.createObjectURL(blobRes.data as Blob), "_blank");
    } finally {
      setPreviewingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{showAll ? "Todos los procesos de firma" : "Procesos de firma"}</h1>
          <p className="text-sm text-muted-foreground">
            {showAll ? "Supervisión administrativa de los procesos creados por todos los usuarios." : "Documentos que has enviado a firmar y su avance."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/signatures/validate-document">
            <Button variant="outline">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Validar documento firmado
            </Button>
          </Link>
          {!showAll && (
            <Link href="/signatures/processes/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo proceso
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={f.search}
            onChange={(e) => f.setSearch(e.target.value)}
            placeholder="Buscar por número de proceso o título..."
            className="pl-9"
          />
        </div>
        <Select value={f.status} onValueChange={f.setStatus}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            {f.statusOptions.map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {!isLoading && !errorMessage && rows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {showAll ? "No existen procesos de firma registrados." : "Todavía no has enviado ningún documento a firmar."}
            </p>
            {!showAll && (
              <Link href="/signatures/processes/new">
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear el primero
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && rows.length > 0 && f.filtered.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ningún proceso coincide con el filtro aplicado.
          </CardContent>
        </Card>
      )}

      {!isLoading && f.paged.length > 0 && (
        <>
          {/* Tabla en pantallas medianas+; tarjetas apiladas en móvil para evitar scroll horizontal incómodo. */}
          <div className="hidden overflow-x-auto rounded-lg border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proceso</TableHead>
                  <TableHead>Documento</TableHead>
                  {showAll && <TableHead>Creado por</TableHead>}
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Avance</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {f.paged.map((row) => {
                  const meta = getProcessStatusMeta(row.status);
                  const Icon = meta.icon;
                  const isCompleted = COMPLETED_STATUSES.has(row.status.toUpperCase());
                  return (
                    <TableRow key={row.processId}>
                      <TableCell>
                        {showAll ? <span className="font-medium">{row.processNumber}</span> : (
                          <Link href={`/signatures/processes/${row.processId}`} className="font-medium text-primary hover:underline">
                            {row.processNumber}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{row.title}</TableCell>
                      {showAll && <TableCell className="max-w-48 truncate">{row.creatorEmail || "—"}</TableCell>}
                      <TableCell>
                        <Badge variant={meta.badgeVariant} className="flex w-fit items-center gap-1">
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{row.progressPercentage}%</TableCell>
                      <TableCell>
                        {!showAll && isCompleted && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Ver documento firmado"
                            disabled={previewingId === row.processId}
                            onClick={() => handleViewDocument(row.processId)}
                          >
                            {previewingId === row.processId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 sm:hidden">
            {f.paged.map((row) => {
              const meta = getProcessStatusMeta(row.status);
              const Icon = meta.icon;
              const isCompleted = COMPLETED_STATUSES.has(row.status.toUpperCase());
              return (
                <Card key={row.processId}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      {showAll ? <span className="font-medium">{row.processNumber}</span> : (
                        <Link href={`/signatures/processes/${row.processId}`} className="font-medium text-primary hover:underline">
                          {row.processNumber}
                        </Link>
                      )}
                      <Badge variant={meta.badgeVariant} className="flex w-fit shrink-0 items-center gap-1">
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{row.title}</p>
                    {showAll && <p className="truncate text-xs text-muted-foreground">Creado por: {row.creatorEmail || "—"}</p>}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{row.progressPercentage}% completado</p>
                      {!showAll && isCompleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={previewingId === row.processId}
                          onClick={() => handleViewDocument(row.processId)}
                        >
                          {previewingId === row.processId ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Eye className="mr-2 h-3.5 w-3.5" />
                          )}
                          Ver documento
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {!isLoading && f.filtered.length > 0 && (
        <DataPagination
          page={f.page}
          totalPages={f.pageCount}
          totalCount={f.totalCount}
          pageSize={f.pageSize}
          hasPreviousPage={f.hasPreviousPage}
          hasNextPage={f.hasNextPage}
          onPageChange={f.setPage}
          onPageSizeChange={f.setPageSize}
        />
      )}
    </main>
  );
}
