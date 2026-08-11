// src/pages/CorrectionsAudit.tsx
import { useState } from 'react';
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
import { ChevronDown, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import { AuditAPI } from '@/lib/api';
import { parseCorrectionDetails, type AuditLogEntry } from '@/types/audit';

const MODULE_OPTIONS: { label: string; tableName: string | null }[] = [
  { label: 'Todos los módulos', tableName: null },
  { label: 'Acciones de Personal', tableName: 'PersonnelActions' },
  { label: 'Contratos', tableName: 'Contracts' },
];

function moduleLabel(tableName: string): string {
  return MODULE_OPTIONS.find((m) => m.tableName === tableName)?.label ?? tableName;
}

function CorrectionRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const details = parseCorrectionDetails(entry);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <TableCell className="w-8">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{moduleLabel(entry.tableName)}</Badge>
        </TableCell>
        <TableCell>#{entry.recordId}</TableCell>
        <TableCell>{entry.userName}</TableCell>
        <TableCell>{new Date(entry.dateTime).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
        <TableCell className="max-w-xs truncate">{details?.reason ?? '—'}</TableCell>
        <TableCell className="text-right text-muted-foreground">
          {details?.changes.length ?? 0} campo(s)
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30">
            {!details || details.changes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Sin detalle de campos.</p>
            ) : (
              <div className="my-2 border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campo</TableHead>
                      <TableHead>Valor anterior</TableHead>
                      <TableHead>Valor nuevo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.changes.map((c) => (
                      <TableRow key={c.field}>
                        <TableCell className="font-medium">{c.field}</TableCell>
                        <TableCell className="text-destructive/80">{c.oldValue ?? '—'}</TableCell>
                        <TableCell className="text-green-700 dark:text-green-400">{c.newValue ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function CorrectionsAuditPage() {
  const [tableName, setTableName] = useState<string>('__all__');
  const [userName, setUserName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isFetching } = useQuery({
    queryKey: ['corrections-audit', tableName, userName, dateFrom, dateTo, page],
    queryFn: () =>
      AuditAPI.searchCorrections({
        tableName: tableName === '__all__' ? null : tableName,
        userName: userName.trim() || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        page,
        pageSize,
      }),
  });

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
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Cambios</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((entry) => (
                      <CorrectionRow key={entry.auditId} entry={entry} />
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
