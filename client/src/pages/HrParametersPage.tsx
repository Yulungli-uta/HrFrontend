// src/pages/HrParametersPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TiposReferenciaAPI } from '@/lib/api';
import { HR_PARAMETER_DOMAINS, HR_PARAMETER_CATEGORIES, type ParameterDomain } from '@/features/constants';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, RefreshCw, Settings2 } from 'lucide-react';
import { parseApiError } from '@/lib/error-handling';

interface RefItem {
  typeId: number;
  category: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

interface FormState {
  category: string;
  name: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { category: '', name: '', description: '', isActive: true };

const prettyCategory = (cat: string) =>
  cat.replace(/_/g, ' ').toLowerCase().replace(/^\w|\s\w/g, m => m.toUpperCase());

export default function HrParametersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(HR_PARAMETER_DOMAINS[0].key);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<RefItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<RefItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // Categorías disponibles en el formulario — siempre del dominio activo
  const [formCategories, setFormCategories] = useState<string[]>([]);

  const { data: allItems = [], isLoading, refetch } = useQuery({
    queryKey: ['ref-types', 'all'],
    queryFn: async () => {
      const res = await TiposReferenciaAPI.list();
      if (res.status !== 'success') return [];
      const arr: any[] = Array.isArray(res.data) ? res.data : [];
      return arr
        .filter(x => HR_PARAMETER_CATEGORIES.includes(x.category ?? ''))
        .map<RefItem>(x => ({
          typeId: x.typeId ?? x.typeID ?? 0,
          category: x.category ?? '',
          name: x.name ?? '',
          description: x.description ?? null,
          isActive: x.isActive === true || x.isActive === 1,
        }));
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: object) => TiposReferenciaAPI.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ref-types'] });
      toast({ title: 'Creado', description: 'Tipo de referencia creado correctamente.' });
      closeForm();
    },
    onError: (err: unknown) => {
      toast({ title: 'Error', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: object }) =>
      TiposReferenciaAPI.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ref-types'] });
      toast({ title: 'Actualizado', description: 'Tipo de referencia actualizado.' });
      closeForm();
    },
    onError: (err: unknown) => {
      toast({ title: 'Error', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => TiposReferenciaAPI.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ref-types'] });
      toast({ title: 'Eliminado', description: 'Tipo de referencia eliminado.' });
      setDeleteItem(null);
    },
    onError: (err: unknown) => {
      toast({ title: 'Error', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  // Abre el formulario de creación escopado al dominio dado
  function openCreate(domain: ParameterDomain) {
    setEditItem(null);
    setFormCategories(domain.categories);
    setForm({ ...EMPTY_FORM, category: domain.categories[0] });
    setIsFormOpen(true);
  }

  // Abre el formulario de edición — categorías restringidas al dominio del item
  function openEdit(item: RefItem) {
    const domain =
      HR_PARAMETER_DOMAINS.find(d => d.categories.includes(item.category)) ??
      HR_PARAMETER_DOMAINS[0];
    setEditItem(item);
    setFormCategories(domain.categories);
    setForm({
      category: item.category,
      name: item.name,
      description: item.description ?? '',
      isActive: item.isActive,
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormCategories([]);
  }

  function handleSave() {
    if (!form.category || !form.name.trim()) {
      toast({ title: 'Validación', description: 'La categoría y el nombre son requeridos.', variant: 'destructive' });
      return;
    }
    const payload = {
      category: form.category,
      name: form.name.trim(),
      description: form.description.trim() || null,
      isActive: form.isActive,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.typeId, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function getTabItems(domainKey: string) {
    const domain = HR_PARAMETER_DOMAINS.find(d => d.key === domainKey);
    if (!domain) return [];
    const q = search.toLowerCase();
    return allItems
      .filter(x => domain.categories.includes(x.category))
      .filter(x => !q || x.name.toLowerCase().includes(q) || x.category.toLowerCase().includes(q));
  }

  const activeDomain = HR_PARAMETER_DOMAINS.find(d => d.key === activeTab)!;
  const tabItems = getTabItems(activeTab);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Parámetros de Recursos Humanos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Administre los catálogos y valores de referencia del módulo de RR.HH.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Refrescar">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => openCreate(activeDomain)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo
          </Button>
        </div>
      </div>

      {/* Tabs por dominio */}
      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSearch(''); }}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {HR_PARAMETER_DOMAINS.map(d => (
            <TabsTrigger key={d.key} value={d.key} className="text-xs sm:text-sm">
              {d.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {HR_PARAMETER_DOMAINS.map(d => (
          <TabsContent key={d.key} value={d.key} className="space-y-4 mt-4">
            {/* Barra de búsqueda + botón agregar */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <Input
                placeholder="Buscar por nombre o categoría..."
                className="sm:max-w-xs text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={() => openCreate(d)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Agregar en {d.label}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : getTabItems(d.key).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <p>No hay registros en esta sección.</p>
                <Button variant="link" className="mt-2" onClick={() => openCreate(d)}>
                  Crear el primero
                </Button>
              </div>
            ) : (
              <>
                {/* Tabla — md y superior */}
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">ID</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="hidden lg:table-cell">Descripción</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-20">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getTabItems(d.key).map(item => (
                        <TableRow key={item.typeId}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{item.typeId}</TableCell>
                          <TableCell className="font-medium text-sm">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{prettyCategory(item.category)}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-xs truncate">
                            {item.description || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">
                              {item.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteItem(item)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Tarjetas — móvil */}
                <div className="md:hidden space-y-3">
                  {getTabItems(d.key).map(item => (
                    <div key={item.typeId} className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteItem(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{prettyCategory(item.category)}</Badge>
                        <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">
                          {item.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Diálogo crear / editar — categorías del dominio activo únicamente */}
      <Dialog open={isFormOpen} onOpenChange={open => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Editar Tipo' : 'Nuevo Tipo de Referencia'}</DialogTitle>
            <DialogDescription>
              {editItem
                ? 'Modifique los datos. La categoría no se puede cambiar.'
                : 'El selector muestra solo las categorías del grupo seleccionado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              {editItem ? (
                // En edición: solo muestra la categoría, no permite cambiarla
                <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                  <Badge variant="outline" className="text-xs">{prettyCategory(form.category)}</Badge>
                </div>
              ) : (
                // En creación: selector restringido al dominio del tab activo
                <Select
                  value={form.category}
                  onValueChange={v => setForm(f => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {formCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{prettyCategory(cat)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del tipo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descripción opcional"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
              />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {editItem ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo confirmar eliminación */}
      <Dialog open={!!deleteItem} onOpenChange={open => { if (!open) setDeleteItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Eliminar <strong>{deleteItem?.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.typeId)}
            >
              {deleteMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
