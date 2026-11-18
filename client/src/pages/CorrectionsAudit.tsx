// src/pages/CorrectionsAudit.tsx
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, ExternalLink, Loader2, ShieldAlert } from 'lucide-react';
import { AuditAPI } from '@/lib/api';
import { parseCorrectionDetails, type AuditLogEntry } from '@/types/audit';
import { formatDateTime } from "@/lib/clock";
import { useRefTypes } from '@/hooks/useRefTypes';
import { fieldLabel, formatChangeValue, meaningfulChanges } from '@/features/audit/correctionFields';

const MODULE_OPTIONS: { label: string; tableName: string | null }[] = [
  { label: 'Todos los módulos', tableName: null },
  { label: 'Acciones de Personal', tableName: 'PersonnelActions' },
  { label: 'Contratos', tableName: 'Contracts' },
];

function moduleLabel(tableName: string): string {
  return MODULE_OPTIONS.find((m) => m.tableName === tableName)?.label ?? tableName;
}

function CorrectionRow({ entry, refNames }: { entry: AuditLogEntry; refNames: ReadonlyMap<number, string> }) {
  const [expanded, setExpanded] = useState(false);
  const details = parseCorrectionDetails(entry);
  const { visible, hiddenCount } = meaningfulChanges(details?.changes ?? []);
  const isAction = entry.tableName === 'PersonnelActions';

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <TableCell className="w-8">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
        <TableCell>
          <div className="font-medium">{entry.recordNumber || 'Sin número'}</div>
          <div className="text-xs text-muted-foreground">
            {moduleLabel(entry.tableName)} · ID {entry.recordId}
          </div>
        </TableCell>
        <TableCell className="max-w-[16rem]">
          <div className="truncate">{entry.personName ?? '—'}</div>
          {entry.recordTypeName && (
            <div className="text-xs text-muted-foreground truncate">{entry.recordTypeName}</div>
          )}
        </TableCell>
        <TableCell>{entry.userName}</TableCell>
        <TableCell className="whitespace-nowrap">
          {formatDateTime(entry.dateTime, 'es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
        </TableCell>
        <TableCell className="max-w-xs">
          <span className="line-clamp-2">{details?.reason || '—'}</span>
        </TableCell>
        <TableCell className="text-right text-muted-foreground whitespace-nowrap">
          {visible.length} campo(s)
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30">
            <div className="my-2 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Motivo: </span>
                    {details?.reason || 'No se registró motivo.'}
                  </p>
                  <p className="text-muted-foreground">
                    {moduleLabel(entry.tableName)} {entry.recordNumber ? `Nº ${entry.recordNumber}` : 'sin número'}
                    {' '}(ID {entry.recordId})
                    {entry.personName ? ` · ${entry.personName}` : ''}
                    {entry.recordTypeName ? ` · ${entry.recordTypeName}` : ''}
                    {entry.recordStatus ? ` · Estado actual: ${entry.recordStatus}` : ''}
                  </p>
                </div>
                {isAction && (
                  <Button asChild variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/personnel-actions/${entry.recordId}`}>
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Ver acción de personal
                    </Link>
                  </Button>
                )}
              </div>

              {visible.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">Sin detalle de campos.</p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campo</TableHead>
                        <TableHead>Valor anterior</TableHead>
                        <TableHead>Valor nuevo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((c) => (
                        <TableRow key={c.field}>
                          <TableCell className="font-medium">{fieldLabel(c.field)}</TableCell>
                          <TableCell className="text-destructive/80">
                            {formatChangeValue(c.field, c.oldValue, refNames)}
                          </TableCell>
                          <TableCell className="text-green-700 dark:text-green-400">
                            {formatChangeValue(c.field, c.newValue, refNames)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {hiddenCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {hiddenCount} cambio(s) técnico(s) omitido(s) (fecha de actualización o diferencias solo de formato).
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function CorrectionsAuditPage() {
  const [tableName, setTableName] = useState<string>('__all__');
  const [userName, setUserName] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isFetching } = useQuery({
    queryKey: ['corrections-audit', tableName, search, userName, dateFrom, dateTo, page],
    queryFn: () =>
      AuditAPI.searchCorrections({
        tableName: tableName === '__all__' ? null : tableName,
        search: search.trim() || null,
        userName: userName.trim() || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        page,
        pageSize,
      }),
  });

  const { data: refData } = useRefTypes();
  const refNames = useMemo(() => {
    const map = new Map<number, string>();
    if (refData?.status === 'success' && Array.isArray(refData.data)) {
      for (const t of refData.data) map.set(t.typeID ?? t.typeId ?? t.id ?? -1, t.name);
    }
    return map;
  }, [refData]);

  const result = data?.status === 'success' ? data.data : null;
  const items = result?.items ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" /> Historial de Correcciones
        </h1>
        <p className="text-muted-foreground">
          Correcciones manuales aplicadas sobre Acciones de Personal y Contratos, en cualquier
          estado — motivo, usuario, fecha y valores anteriores/nuevos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Combina cualquiera de estos filtros para acotar la búsqueda.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <Label>Módulo</Label>
            <Select
              value={tableName}
              onValueChange={(v) => { setTableName(v); setPage(1); }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los módulos</SelectItem>
                {MODULE_OPTIONS.filter((m) => m.tableName).map((m) => (
                  <SelectItem key={m.tableName!} value={m.tableName!}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Buscar registro</Label>
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nº de documento, nombre o cédula"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Usuario</Label>
            <Input
              value={userName}
              onChange={(e) => { setUserName(e.target.value); setPage(1); }}
              placeholder="Nombre de usuario"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Desde</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
            Correcciones {result ? `(${result.totalCount})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isFetching ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2 py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No hay correcciones registradas con estos filtros.</p>
          ) : (
            <>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Módulo</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Persona</TableHead>
                      <TableHead>Corregido por</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Cambios</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((entry) => (
                      <CorrectionRow key={entry.auditId} entry={entry} refNames={refNames} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {result && result.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {result.page} de {result.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= result.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
