// client/src/pages/admin/AppParams.tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { SlidersHorizontal, Plus, Edit, Trash2, Search, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { AppParamsAPI, type CreateAppParamDto } from "@/lib/api";
import { usePaged } from "@/hooks/pagination/usePaged";
import { DataPagination } from "@/components/ui/DataPagination";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import { parseApiError } from "@/lib/error-handling";

interface AppParamRow {
  nemonic: string;
  value: string;
  dataType: string;
  category: string;
  description: string | null;
  isEncrypted: boolean;
  lastModified: string | null;
  modifiedBy: string | null;
}

// Varios parámetros de esta tabla (ej. AZURE_AD_CLIENT_SECRET) son secretos guardados en
// texto plano con IsEncrypted=0 — el flag no es confiable para decidir qué ocultar. Se
// enmascara por nombre en vez de confiar solo en IsEncrypted, y siempre requiere un clic
// explícito para revelar (nunca se muestra el valor real de entrada al abrir la pantalla).
const SENSITIVE_NEMONIC_PATTERN = /secret|password|clave|token.*key|private/i;
function looksSensitive(row: AppParamRow): boolean {
  return row.isEncrypted || SENSITIVE_NEMONIC_PATTERN.test(row.nemonic);
}

function maskValue(value: string): string {
  if (!value) return "";
  return "•".repeat(Math.min(value.length, 24));
}

export default function AppParamsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<AppParamRow | null>(null);
  const [deleteNemonic, setDeleteNemonic] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const { setIsFormDirty, handleOpenChange, close: closeForm, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard((open) => {
      setIsFormOpen(open);
      if (!open) setEditingParam(null);
    });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    items: params,
    isLoading,
    isError,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    setPageSize,
    setSearch,
    currentParams,
  } = usePaged<AppParamRow>({
    queryKey: "app-params",
    queryFn: async (reqParams) => {
      const res: any = await AppParamsAPI.list(reqParams.page, reqParams.pageSize);

      // El backend de RepositoryUta no siempre envuelve la respuesta igual — misma
      // normalización defensiva que ya usa RolesPage.tsx para el mismo servicio.
      if (res?.status === "success" && res?.data?.items) return res;
      if (res?.status === "success" && res?.data?.success && res?.data?.data) {
        return { status: "success", data: res.data.data };
      }
      if (res?.success && res?.data) return { status: "success", data: res.data };
      return res;
    },
    initialPageSize: 20,
  });

  const deleteMutation = useMutation({
    mutationFn: (nemonic: string) => AppParamsAPI.remove(nemonic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-params"] });
      toast({ title: "Parámetro eliminado", description: "El parámetro ha sido eliminado." });
      setDeleteNemonic(null);
    },
    onError: (err: unknown) => {
      toast({ title: "Error al eliminar", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  const toggleReveal = (nemonic: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(nemonic)) next.delete(nemonic);
      else next.add(nemonic);
      return next;
    });
  };

  const handleEdit = (param: AppParamRow) => {
    setEditingParam(param);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">No se pudieron cargar los parámetros. Intente nuevamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-8 w-8" />
            Parámetros del Sistema (Auth)
          </h1>
          <p className="text-muted-foreground mt-2">
            Configuración de RepositoryUta (auth.tbl_AppParams) — cambios en caliente, sin redeploy.
            Solo Administrador y R_DITIC.
          </p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setEditingParam(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo parámetro
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingParam ? "Editar parámetro" : "Nuevo parámetro"}</DialogTitle>
              <DialogDescription>
                {editingParam
                  ? "El cambio aplica en caliente (hasta 5 min por caché) — no requiere reiniciar el servicio."
                  : "Complete los campos y guarde para crear el parámetro."}
              </DialogDescription>
            </DialogHeader>

            <AppParamForm
              param={editingParam}
              onSuccess={closeForm}
              onCancel={closeForm}
              onDirtyChange={setIsFormDirty}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Buscar por nombre, categoría o descripción..."
              value={currentParams.search ?? ""}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nemonic</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Última modificación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {params.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {currentParams.search ? "No se encontraron parámetros" : "No hay parámetros registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                params.map((p) => {
                  const sensitive = looksSensitive(p);
                  const isRevealed = revealed.has(p.nemonic);
                  return (
                    <TableRow key={p.nemonic}>
                      <TableCell className="font-mono text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          {p.nemonic}
                          {sensitive && (
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label="Valor sensible" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">
                            {sensitive && !isRevealed ? maskValue(p.value) : p.value}
                          </span>
                          {sensitive && (
                            <ActionIconButton
                              icon={isRevealed ? EyeOff : Eye}
                              label={isRevealed ? "Ocultar valor" : "Mostrar valor"}
                              tone="primary"
                              onClick={() => toggleReveal(p.nemonic)}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[280px] truncate">
                        {p.description || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.lastModified ? new Date(p.lastModified).toLocaleString() : "-"}
                        {p.modifiedBy && <div className="text-muted-foreground/70">{p.modifiedBy}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <ActionIconButton
                            icon={Edit}
                            label="Editar parámetro"
                            tone="primary"
                            onClick={() => handleEdit(p)}
                          />
                          <ActionIconButton
                            icon={Trash2}
                            label="Eliminar parámetro"
                            tone="destructive"
                            onClick={() => setDeleteNemonic(p.nemonic)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        disabled={isLoading}
      />

      <AlertDialog open={!!deleteNemonic} onOpenChange={() => setDeleteNemonic(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si algún servicio depende de este parámetro (ej.{" "}
              <code>Jwt:AccessTokenLifetimeMinutes</code>), caerá al valor de respaldo en{" "}
              <code>appsettings.json</code> del backend correspondiente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNemonic && deleteMutation.mutate(deleteNemonic)}
              className="bg-destructive hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <UnsavedChangesDialog open={confirmOpen} onClose={closeConfirm} onConfirmExit={confirmExit} />
    </div>
  );
}

function AppParamForm({
  param,
  onSuccess,
  onCancel,
  onDirtyChange,
}: {
  param: AppParamRow | null;
  onSuccess: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!param;
  const sensitive = param ? looksSensitive(param) : false;

  const [nemonic, setNemonic] = useState(param?.nemonic ?? "");
  const [value, setValue] = useState(param?.value ?? "");
  const [category, setCategory] = useState(param?.category ?? "General");
  const [dataType, setDataType] = useState(param?.dataType ?? "string");
  const [description, setDescription] = useState(param?.description ?? "");
  const [valueTouched, setValueTouched] = useState(false);

  const markDirty = () => onDirtyChange?.(true);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        const dto = { value, category, dataType, description: description || null };
        return AppParamsAPI.update(param.nemonic, dto);
      }
      const dto: CreateAppParamDto = { nemonic, value, category, dataType, description: description || null };
      return AppParamsAPI.create(dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-params"] });
      toast({
        title: isEditing ? "Parámetro actualizado" : "Parámetro creado",
        description: isEditing
          ? "El cambio se aplicará en caliente (hasta 5 min por caché de los servicios)."
          : "El parámetro ha sido creado.",
      });
      onDirtyChange?.(false);
      onSuccess();
    },
    onError: (err: unknown) => {
      toast({ title: "Error al guardar", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      {!isEditing && (
        <div className="space-y-1.5">
          <Label>Nemonic (clave única) <span className="text-destructive">*</span></Label>
          <Input
            value={nemonic}
            onChange={(e) => {
              setNemonic(e.target.value);
              markDirty();
            }}
            placeholder="Ej: Jwt:AccessTokenLifetimeMinutes"
            required
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Valor <span className="text-destructive">*</span></Label>
        {sensitive && !valueTouched ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setValueTouched(true)}
          >
            <Eye className="mr-2 h-3.5 w-3.5" />
            Mostrar y editar valor sensible
          </Button>
        ) : (
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              markDirty();
            }}
            placeholder="Valor"
            required
            type={sensitive ? "text" : "text"}
            autoComplete="off"
          />
        )}
        {sensitive && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Este parámetro parece sensible (credencial/secreto).
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Input
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              markDirty();
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de dato</Label>
          <Input
            value={dataType}
            onChange={(e) => {
              setDataType(e.target.value);
              markDirty();
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Descripción</Label>
        <Textarea
          value={description ?? ""}
          onChange={(e) => {
            setDescription(e.target.value);
            markDirty();
          }}
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
        </Button>
      </DialogFooter>
    </form>
  );
}
