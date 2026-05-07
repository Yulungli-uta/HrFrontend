// src/components/forms/LocalAdUserForm.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

import { LocalAdManagementAPI } from "@/lib/api";
import type { LocalAdUserResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";

// ─── Esquemas ────────────────────────────────────────────────────────────────

const passwordRules = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número");

const createSchema = z.object({
  email: z.string().min(1, "El email es requerido").email("Email inválido"),
  displayName: z.string().min(1, "El nombre de pantalla es requerido"),
  givenName: z.string().optional(),
  surname: z.string().optional(),
  initialPassword: passwordRules,
  forcePasswordChange: z.boolean(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  accountEnabled: z.boolean(),
});

const editSchema = z.object({
  displayName: z.string().min(1, "El nombre de pantalla es requerido"),
  givenName: z.string().optional(),
  surname: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  user?: LocalAdUserResponse | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function LocalAdUserForm({ user, onSuccess, onCancel }: Props) {
  const isEdit = !!user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  // ── Formulario CREATE ──
  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      email: "",
      displayName: "",
      givenName: "",
      surname: "",
      initialPassword: "",
      forcePasswordChange: true,
      jobTitle: "",
      department: "",
      accountEnabled: true,
    },
  });

  // ── Formulario EDIT ──
  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      displayName: user?.displayName ?? "",
      givenName: user?.givenName ?? "",
      surname: user?.surname ?? "",
      jobTitle: user?.jobTitle ?? "",
      department: user?.department ?? "",
    },
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: CreateFormData) =>
      LocalAdManagementAPI.createUser({
        email: data.email,
        displayName: data.displayName,
        givenName: data.givenName || null,
        surname: data.surname || null,
        initialPassword: data.initialPassword,
        forcePasswordChange: data.forcePasswordChange,
        jobTitle: data.jobTitle || null,
        department: data.department || null,
        accountEnabled: data.accountEnabled,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-ad-users"] });
      toast({ title: "Usuario creado", description: "El usuario fue creado en el Active Directory local." });
      onSuccess();
    },
    onError: (err: unknown) => {
      toast({ title: "Error al crear usuario", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditFormData) =>
      LocalAdManagementAPI.updateUser(user!.id, {
        displayName: data.displayName,
        givenName: data.givenName || null,
        surname: data.surname || null,
        jobTitle: data.jobTitle || null,
        department: data.department || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-ad-users"] });
      toast({ title: "Usuario actualizado", description: "Los datos del usuario fueron actualizados." });
      onSuccess();
    },
    onError: (err: unknown) => {
      toast({ title: "Error al actualizar", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  // ── Render EDIT ──
  if (isEdit) {
    const { register, handleSubmit, formState: { errors } } = editForm;
    return (
      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="e-displayName">Nombre completo *</Label>
            <Input id="e-displayName" {...register("displayName")} placeholder="Juan Pérez" />
            {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-givenName">Nombre</Label>
            <Input id="e-givenName" {...register("givenName")} placeholder="Juan" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-surname">Apellido</Label>
            <Input id="e-surname" {...register("surname")} placeholder="Pérez" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-jobTitle">Cargo</Label>
            <Input id="e-jobTitle" {...register("jobTitle")} placeholder="Ej: Analista de Sistemas" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-department">Departamento</Label>
            <Input id="e-department" {...register("department")} placeholder="Ej: Tecnología" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90">
            {updateMutation.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
              : "Guardar cambios"}
          </Button>
        </div>
      </form>
    );
  }

  // ── Render CREATE ──
  const { register, handleSubmit, formState: { errors }, watch, setValue } = createForm;
  const accountEnabled = watch("accountEnabled");
  const forcePasswordChange = watch("forcePasswordChange");

  return (
    <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="c-email">Email corporativo *</Label>
          <Input id="c-email" type="email" {...register("email")} placeholder="usuario@dominio.local" />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        {/* displayName */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="c-displayName">Nombre completo (displayName) *</Label>
          <Input id="c-displayName" {...register("displayName")} placeholder="Juan Pérez" />
          {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
        </div>

        {/* givenName + surname */}
        <div className="space-y-2">
          <Label htmlFor="c-givenName">Nombre</Label>
          <Input id="c-givenName" {...register("givenName")} placeholder="Juan" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-surname">Apellido</Label>
          <Input id="c-surname" {...register("surname")} placeholder="Pérez" />
        </div>

        {/* Contraseña inicial */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="c-password">Contraseña inicial *</Label>
          <div className="relative">
            <Input
              id="c-password"
              type={showPassword ? "text" : "password"}
              {...register("initialPassword")}
              placeholder="Mín. 8 caracteres, mayúscula y número"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.initialPassword && (
            <p className="text-sm text-destructive">{errors.initialPassword.message}</p>
          )}
        </div>

        {/* Cargo + Departamento */}
        <div className="space-y-2">
          <Label htmlFor="c-jobTitle">Cargo</Label>
          <Input id="c-jobTitle" {...register("jobTitle")} placeholder="Ej: Analista" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-department">Departamento</Label>
          <Input id="c-department" {...register("department")} placeholder="Ej: TI" />
        </div>

        {/* Switches */}
        <div className="flex items-center gap-3 py-1">
          <Switch
            id="c-accountEnabled"
            checked={accountEnabled}
            onCheckedChange={(v) => setValue("accountEnabled", v)}
          />
          <Label htmlFor="c-accountEnabled" className="cursor-pointer">Cuenta habilitada al crear</Label>
        </div>

        <div className="flex items-center gap-3 py-1">
          <Checkbox
            id="c-forceChange"
            checked={forcePasswordChange}
            onCheckedChange={(v) => setValue("forcePasswordChange", Boolean(v))}
          />
          <Label htmlFor="c-forceChange" className="cursor-pointer text-sm">
            Forzar cambio de contraseña al primer ingreso
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90">
          {createMutation.isPending
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</>
            : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
