import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Plus, Pencil, ArrowRight, ChevronRight } from "lucide-react";
import {
  AcademicLadderAPI,
  type AcademicLadderDto,
  type AcademicLadderCreateDto,
  type AcademicLadderUpdateDto,
} from "@/lib/api";

// ─── Validación ──────────────────────────────────────────────────────────────

const formSchema = z.object({
  code: z.string().min(2, "Mínimo 2 caracteres").max(30).optional(),
  name: z.string().min(3, "Mínimo 3 caracteres").max(120),
  sequence: z.coerce.number().int().min(1, "Secuencia mínima: 1"),
  nextLadderId: z.coerce.number().int().nullable().optional(),
  minYearsService: z.coerce.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AcademicLadderPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicLadderDto | null>(null);

  const { data, isLoading, error } = useQuery<{ status: string; data: AcademicLadderDto[] }>({
    queryKey: ["/api/v1/rh/academic-ladder"],
    queryFn: () => AcademicLadderAPI.getAll() as any,
  });

  const ladders: AcademicLadderDto[] = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: (dto: AcademicLadderCreateDto) => AcademicLadderAPI.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/v1/rh/academic-ladder"] });
      toast({ title: "Escalafón creado correctamente" });
      setIsOpen(false);
    },
    onError: () => toast({ title: "Error al crear el escalafón", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: AcademicLadderUpdateDto }) =>
      AcademicLadderAPI.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/v1/rh/academic-ladder"] });
      toast({ title: "Escalafón actualizado correctamente" });
      setIsOpen(false);
    },
    onError: () => toast({ title: "Error al actualizar el escalafón", variant: "destructive" }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "", name: "", sequence: 1, nextLadderId: null, minYearsService: null, isActive: true },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ code: "", name: "", sequence: ladders.length + 1, nextLadderId: null, minYearsService: null, isActive: true });
    setIsOpen(true);
  };

  const openEdit = (ladder: AcademicLadderDto) => {
    setEditing(ladder);
    form.reset({
      name: ladder.name,
      sequence: ladder.sequence,
      nextLadderId: ladder.nextLadderId,
      minYearsService: ladder.minYearsService,
      isActive: ladder.isActive,
    });
    setIsOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    if (editing) {
      updateMut.mutate({
        id: editing.ladderId,
        dto: {
          name: values.name,
          sequence: values.sequence,
          nextLadderId: values.nextLadderId ?? null,
          minYearsService: values.minYearsService ?? null,
          isActive: values.isActive ?? true,
        },
      });
    } else {
      createMut.mutate({
        code: values.code!,
        name: values.name,
        sequence: values.sequence,
        nextLadderId: values.nextLadderId ?? null,
        minYearsService: values.minYearsService ?? null,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Error al cargar el escalafón docente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            Escalafón Docente
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Progresión secuencial de categorías y niveles según la LOES
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Escalafón
        </Button>
      </div>

      {/* Visualización de cadena */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Cadena de Progresión</CardTitle>
          <CardDescription>Cada escalafón solo puede postular al siguiente indicado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {[...ladders]
              .filter(l => l.isActive)
              .sort((a, b) => a.sequence - b.sequence)
              .map((ladder, idx, arr) => (
                <div key={ladder.ladderId} className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <Badge
                      variant="outline"
                      className="px-3 py-1.5 text-xs font-medium bg-primary/5 border-primary/30 text-primary whitespace-nowrap"
                    >
                      {ladder.name}
                    </Badge>
                    {ladder.minYearsService && (
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {ladder.minYearsService} años mín.
                      </span>
                    )}
                  </div>
                  {idx < arr.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Escalafones</CardTitle>
          <CardDescription>{ladders.length} escalafones registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Seq.</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Nivel</TableHead>
                  <TableHead className="hidden md:table-cell">Años mín.</TableHead>
                  <TableHead className="hidden md:table-cell">Siguiente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...ladders].sort((a, b) => a.sequence - b.sequence).map(ladder => (
                  <TableRow key={ladder.ladderId}>
                    <TableCell className="font-mono font-bold text-primary">
                      {ladder.sequence}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ladder.code}</TableCell>
                    <TableCell className="font-medium">{ladder.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {ladder.categoryName ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {ladder.levelName ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {ladder.minYearsService != null ? `${ladder.minYearsService} años` : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {ladder.nextLadderName ? (
                        <span className="flex items-center gap-1 text-sm text-primary">
                          <ArrowRight className="h-3 w-3" />
                          {ladder.nextLadderName}
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Nivel máximo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={ladder.isActive
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"}
                      >
                        {ladder.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(ladder)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog create/edit */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Escalafón" : "Nuevo Escalafón"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Modifique los datos del escalafón seleccionado."
                : "Complete la información del nuevo escalafón docente."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">

            {!editing && (
              <div className="space-y-1">
                <Label htmlFor="code">Código <span className="text-destructive">*</span></Label>
                <Input
                  id="code"
                  placeholder="ej: TITULAR_AGREGADO_1"
                  {...form.register("code")}
                />
                {form.formState.errors.code && (
                  <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
              <Input id="name" placeholder="ej: Titular Agregado 1" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="sequence">Secuencia <span className="text-destructive">*</span></Label>
                <Input id="sequence" type="number" min={1} {...form.register("sequence")} />
                {form.formState.errors.sequence && (
                  <p className="text-xs text-destructive">{form.formState.errors.sequence.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="minYearsService">Años mínimos</Label>
                <Input
                  id="minYearsService"
                  type="number"
                  min={0}
                  placeholder="ej: 4"
                  {...form.register("minYearsService")}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Escalafón siguiente</Label>
              <Select
                value={form.watch("nextLadderId")?.toString() ?? "none"}
                onValueChange={(v) =>
                  form.setValue("nextLadderId", v === "none" ? null : Number(v))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin siguiente (nivel máximo)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin siguiente (nivel máximo)</SelectItem>
                  {ladders
                    .filter(l => !editing || l.ladderId !== editing.ladderId)
                    .sort((a, b) => a.sequence - b.sequence)
                    .map(l => (
                      <SelectItem key={l.ladderId} value={l.ladderId.toString()}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {editing && (
              <div className="flex items-center gap-3">
                <Switch
                  id="isActive"
                  checked={form.watch("isActive") ?? true}
                  onCheckedChange={(v) => form.setValue("isActive", v)}
                />
                <Label htmlFor="isActive">Activo</Label>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending}
              >
                {editing ? "Guardar Cambios" : "Crear Escalafón"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
