// src/pages/PersonnelActions.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataPagination } from '@/components/ui/DataPagination';
import {
  Plus,
  Search,
  FileText,
  User,
  Calendar,
  X,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PersonnelActionsAPI } from '@/lib/api/services/contracts';
import { PersonnelActionForm } from '@/components/personnelActions/PersonnelActionForm';
import type {
  PersonnelActionSummary,
  PersonnelActionQueryFilter,
  CreatePersonnelActionRequest,
} from '@/types/personnel-actions';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'GENERADO', label: 'Generado' },
  { value: 'PENDIENTE_FIRMAS', label: 'Pendiente de Firmas' },
  { value: 'FIRMADO_CARGADO', label: 'Firmado Cargado' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'ANULADO', label: 'Anulado' },
];

const STATUS_BADGE: Record<string, string> = {
  BORRADOR: 'bg-secondary text-secondary-foreground',
  GENERADO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PENDIENTE_FIRMAS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  FIRMADO_CARGADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  FINALIZADO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ANULADO: 'bg-destructive/10 text-destructive',
};

const PAGE_SIZE = 20;

export default function PersonnelActionsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<PersonnelActionQueryFilter>({
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['personnel-actions', filter],
    queryFn: () => PersonnelActionsAPI.getPaged(filter),
    staleTime: 30_000,
  });

  const result = data?.status === 'success' ? data.data : null;
  const items: PersonnelActionSummary[] = result?.items ?? [];
  const totalCount = result?.totalCount ?? 0;
  const totalPages = result?.totalPages ?? 0;
  const page = result?.page ?? 1;

  const createMutation = useMutation({
    mutationFn: (payload: CreatePersonnelActionRequest) =>
      PersonnelActionsAPI.create(payload),
    onSuccess: (resp) => {
      if (resp.status !== 'success') return;
      const { actionId, pdfBase64, fileName } = resp.data;
      if (pdfBase64) {
        queryClient.setQueryData(
          ['personnel-action-created-pdf', actionId],
          { pdfBase64, fileName: fileName ?? null }
        );
      }
      queryClient.invalidateQueries({ queryKey: ['personnel-actions'] });
      toast({ title: 'Acción de personal creada.' });
      setCreateOpen(false);
      navigate(`/personnel-actions/${actionId}`);
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al crear la acción.' }),
  });

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const applySearch = () => {
    setFilter((prev) => ({ ...prev, search: searchInput.trim() || null, page: 1 }));
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setFilter((prev) => ({
      ...prev,
      status: value === 'all' ? null : value,
      page: 1,
    }));
  };

  const clearSearch = () => {
    setSearchInput('');
    setFilter((prev) => ({ ...prev, search: null, page: 1 }));
  };

  const goToPage = (p: number) => setFilter((prev) => ({ ...prev, page: p }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando acciones de personal…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">Error al cargar las acciones de personal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">

      {/* ── Cabecera ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Acciones de Personal</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona el flujo documental de acciones de personal
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="lg" className="w-full md:w-auto">
          <Plus className="h-5 w-5 mr-2" /> Nueva Acción
        </Button>
      </div>

      {/* ── Métricas ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: totalCount, icon: FileText },
          { label: 'Mostradas', value: items.length, icon: User },
          { label: 'Página', value: page, icon: Calendar },
          { label: 'Páginas', value: totalPages, icon: FileText },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filtros ───────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                placeholder="Buscar por empleado o N° de acción…"
                className="pl-10 pr-10"
              />
              {searchInput && (
                <X
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
                  onClick={clearSearch}
                />
              )}
            </div>

            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabla (desktop) ───────────────────────────────── */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {['N°', 'Empleado', 'Tipo', 'Fecha', 'Vigencia', 'Estado', ''].map((h) => (
                    <th
                      key={h}
                      className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                      No hay acciones de personal registradas.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.actionId}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/personnel-actions/${item.actionId}`)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium">#{item.actionId}</p>
                          {item.actionNumber && (
                            <p className="text-xs text-muted-foreground">{item.actionNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.employeeFullName}</p>
                            <p className="text-xs text-muted-foreground">{item.employeeIdCard}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{item.actionTypeName}</td>
                      <td className="p-4 text-sm">{item.actionDate?.slice(0, 10)}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {item.effectiveDate?.slice(0, 10) ?? '—'}
                      </td>
                      <td className="p-4">
                        <Badge className={STATUS_BADGE[item.status] ?? ''}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/personnel-actions/${item.actionId}`);
                          }}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Tarjetas (mobile) ────────────────────────────── */}
      <div className="lg:hidden space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              No hay acciones de personal registradas.
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card
              key={item.actionId}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/personnel-actions/${item.actionId}`)}
            >
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">#{item.actionId}</p>
                    {item.actionNumber && (
                      <p className="text-xs text-muted-foreground">{item.actionNumber}</p>
                    )}
                  </div>
                  <Badge className={STATUS_BADGE[item.status] ?? ''}>
                    {item.status}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.employeeFullName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{item.actionTypeName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{item.actionDate?.slice(0, 10)}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/personnel-actions/${item.actionId}`);
                  }}
                >
                  Ver detalle
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Paginación ────────────────────────────────────── */}
      <DataPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={filter.pageSize ?? PAGE_SIZE}
        hasPreviousPage={page > 1}
        hasNextPage={page < totalPages}
        onPageChange={goToPage}
        onPageSizeChange={(size) => setFilter((prev) => ({ ...prev, pageSize: size, page: 1 }))}
        disabled={isLoading}
      />

      {/* ── Dialog Crear ──────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Acción de Personal</DialogTitle>
          </DialogHeader>
          <PersonnelActionForm
            isBusy={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
