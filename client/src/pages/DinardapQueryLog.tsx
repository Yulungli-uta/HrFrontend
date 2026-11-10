// src/pages/DinardapQueryLog.tsx
// Auditoría de consultas a DINARDAP: quién consultó, qué paquete, a qué identificación (enmascarada), cuándo y con qué
// resultado. Solo lectura, paginada (permiso AUDIT.READ).
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterX, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/ui/DataPagination";
import { DinardapQueryLogAPI } from "@/lib/api";
import type { DinardapOrigin, DinardapOutcome, DinardapPackage } from "@/lib/api";
import { formatDateTime } from "@/lib/clock";

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const ALL = "ALL";

const PACKAGE_LABELS: Record<DinardapPackage, string> = {
  REGISTRO_CIVIL: "Registro Civil",
  TITULOS: "Títulos",
  TCE: "TCE (sufragio)",
};
const ORIGIN_LABELS: Record<DinardapOrigin, string> = {
  USER: "Usuario",
  SYSTEM: "Proceso del sistema",
};
const OUTCOME_LABELS: Record<DinardapOutcome, string> = {
  OK: "Consultado",
  UNAVAILABLE: "No disponible",
  FORBIDDEN: "Sin permiso",
};

export default function DinardapQueryLogPage() {
  const [userText, setUserText] = useState("");
  const [user, setUser] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pkg, setPkg] = useState<DinardapPackage | "">("");
  const [origin, setOrigin] = useState<DinardapOrigin | "">("");
  const [outcome, setOutcome] = useState<DinardapOutcome | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Búsqueda de usuario con pausa para no consultar en cada tecla.
  useEffect(() => {
    const handle = setTimeout(() => {
      setUser(userText.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [userText]);

  // Rango inválido (desde posterior a hasta): se avisa y no se consulta.
  const invalidRange = !!from && !!to && from > to;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dinardap-query-log", user, from, to, pkg, origin, outcome, page, pageSize],
    queryFn: () =>
      DinardapQueryLogAPI.search({ user, from: from || undefined, to: to || undefined, package: pkg, origin, outcome, page, pageSize }),
    placeholderData: (prev) => prev,
    enabled: !invalidRange,
  });

  const hasFilters = !!userText || !!from || !!to || !!pkg || !!origin || !!outcome;
  const clearFilters = () => {
    setUserText("");
    setUser("");
    setFrom("");
    setTo("");
    setPkg("");
    setOrigin("");
    setOutcome("");
    setPage(1);
  };

  const paged = data?.status === "success" ? data.data : null;
  const items = paged?.items ?? [];
  const forbidden = data?.status === "error" && data.error?.code === 403;

  const resetPage = () => setPage(1);

  return (
    <div className="container mx-auto space-y-4 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Consultas a DINARDAP</CardTitle>
          <CardDescription>
            Quién consultó Registro Civil, Títulos o TCE desde el sistema, cuándo y con qué resultado. La identificación consultada se
            muestra enmascarada.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="dq-user">Usuario (correo o nombre)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="dq-user" className="pl-9" placeholder="Buscar…" value={userText} onChange={(e) => setUserText(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dq-from">Desde</Label>
              <Input
                id="dq-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  setFrom(e.target.value);
                  resetPage();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dq-to">Hasta</Label>
              <Input
                id="dq-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  resetPage();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Paquete</Label>
              <Select
                value={pkg || ALL}
                onValueChange={(v) => {
                  setPkg(v === ALL ? "" : (v as DinardapPackage));
                  resetPage();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {(Object.keys(PACKAGE_LABELS) as DinardapPackage[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PACKAGE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Origen</Label>
              <Select
                value={origin || ALL}
                onValueChange={(v) => {
                  setOrigin(v === ALL ? "" : (v as DinardapOrigin));
                  resetPage();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {(Object.keys(ORIGIN_LABELS) as DinardapOrigin[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {ORIGIN_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Resultado</Label>
              <Select
                value={outcome || ALL}
                onValueChange={(v) => {
                  setOutcome(v === ALL ? "" : (v as DinardapOutcome));
                  resetPage();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {(Object.keys(OUTCOME_LABELS) as DinardapOutcome[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {OUTCOME_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={clearFilters} disabled={!hasFilters}>
                <FilterX className="mr-2 h-4 w-4" /> Limpiar
              </Button>
            </div>
          </div>
          {invalidRange && <p className="text-sm text-destructive">La fecha «desde» no puede ser posterior a la fecha «hasta».</p>}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : forbidden ? (
            <p className="py-8 text-center text-sm text-destructive">No tiene permiso para ver la auditoría de consultas.</p>
          ) : isError || data?.status === "error" ? (
            <p className="py-8 text-center text-sm text-destructive">No se pudo cargar el registro de consultas.</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {hasFilters ? "Ninguna consulta coincide con los filtros." : "Aún no hay consultas registradas."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Paquete</TableHead>
                    <TableHead>Identificación</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead className="text-right">Duración</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(q.queriedAt)}</TableCell>
                      <TableCell className="min-w-[12rem]">
                        {q.origin === "SYSTEM" ? (
                          <span className="text-muted-foreground">Proceso del sistema</span>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-medium">{q.userFullName || q.userEmail || "—"}</div>
                            {q.userFullName && q.userEmail && <div className="text-xs text-muted-foreground">{q.userEmail}</div>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={q.origin === "USER" ? "default" : "secondary"}>{ORIGIN_LABELS[q.origin] ?? q.origin}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{PACKAGE_LABELS[q.package] ?? q.package}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{q.identificationMasked}</TableCell>
                      <TableCell>
                        <Badge variant={q.outcome === "OK" ? "outline" : "destructive"}>{OUTCOME_LABELS[q.outcome] ?? q.outcome}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{q.durationMs != null ? `${q.durationMs} ms` : "—"}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{q.sourceIp ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {paged && paged.totalCount > 0 && (
            <DataPagination
              page={paged.page}
              totalPages={paged.totalPages}
              totalCount={paged.totalCount}
              pageSize={paged.pageSize}
              hasPreviousPage={paged.hasPreviousPage}
              hasNextPage={paged.hasNextPage}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
