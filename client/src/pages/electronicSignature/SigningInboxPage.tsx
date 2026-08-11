// src/pages/electronicSignature/SigningInboxPage.tsx
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FileText, PenLine, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataPagination } from "@/components/ui/DataPagination";
import { SignatureProcessesAPI } from "@/lib/api";
import { getProcessStatusMeta, getParticipantStatusMeta } from "@/features/electronicSignature/signatureStatus";
import { useSignatureListFilters } from "@/hooks/electronicSignature/useSignatureListFilters";

const SIGNED_STATUSES = new Set(["SIGNED", "REJECTED"]);

export default function SigningInboxPage() {
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["signature-inbox"],
    queryFn: () => SignatureProcessesAPI.inbox(),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const rows = data?.status === "success" ? data.data : [];
  const errorMessage = data?.status === "error" ? data.error.message : isError ? "No se pudo cargar la bandeja." : null;

  const f = useSignatureListFilters(rows, (row) => getProcessStatusMeta(row.status).label);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Mi bandeja de firmas</h1>
        <p className="text-sm text-muted-foreground">Documentos que te han enviado a firmar.</p>
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
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {!isLoading && !errorMessage && rows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No tienes procesos de firma asignados.</p>
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
        <div className={`grid gap-3 ${isFetching ? "opacity-70 transition-opacity" : ""}`}>
          {f.paged.map((row) => {
            const processMeta = getProcessStatusMeta(row.status);
            const ProcessIcon = processMeta.icon;
            const mineMeta = row.myParticipantStatus ? getParticipantStatusMeta(row.myParticipantStatus) : null;
            const MineIcon = mineMeta?.icon;
            const alreadyDone = SIGNED_STATUSES.has((row.myParticipantStatus ?? "").toUpperCase());

            return (
              <Card key={row.processId}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <Link className="font-semibold text-primary hover:underline" href={`/signatures/processes/${row.processId}`}>
                      {row.processNumber}
                    </Link>
                    <p className="truncate text-sm">{row.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={processMeta.badgeVariant} className="flex w-fit items-center gap-1">
                        <ProcessIcon className="h-3.5 w-3.5" />
                        {processMeta.label}
                      </Badge>
                      {mineMeta && MineIcon && (
                        <Badge variant={mineMeta.badgeVariant} className="flex w-fit items-center gap-1">
                          <MineIcon className="h-3.5 w-3.5" />
                          Mi firma: {mineMeta.label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/signatures/processes/${row.processId}`}>
                      <Button variant="outline" size="sm">
                        Ver detalle
                      </Button>
                    </Link>
                    {!alreadyDone && (
                      <Link href={`/signatures/processes/${row.processId}/sign`}>
                        <Button size="sm">
                          <PenLine className="mr-2 h-4 w-4" />
                          Firmar
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
