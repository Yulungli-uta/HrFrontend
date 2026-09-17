// src/components/forms/PersonCreateDialog.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2, ShieldCheck, AlertTriangle, ServerCrash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PersonasAPI } from '@/lib/api';
import type { PersonDto } from '@/lib/api';
import { useDinardapLookup } from '@/hooks/useDinardapLookup';

const IDENT_TYPES = [
  { value: 1, label: 'Cédula' },
  { value: 2, label: 'Pasaporte' },
  { value: 3, label: 'RUC' },
];

const schema = z.object({
  firstName: z.string().min(1, 'Requerido'),
  lastName:  z.string().min(1, 'Requerido'),
  identType: z.coerce.number().positive('Requerido'),
  idCard:    z.string().min(1, 'Requerido'),
  email:     z.string().email('Email inválido'),
  phone:     z.string().optional(),
  birthDate: z.string().min(1, 'Requerido'),
  preferredDenomination: z.string().max(200, 'Máximo 200 caracteres').optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (person: PersonDto) => void;
};

export function PersonCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();

  const [duplicateFound, setDuplicateFound] = useState<{ name: string; idCard: string } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [acknowledgedDuplicate, setAcknowledgedDuplicate] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      identType: 1,
      idCard: '',
      email: '',
      phone: '',
      birthDate: '',
      preferredDenomination: '',
    },
  });

  const dinardap = useDinardapLookup({
    onFound: (d) => {
      const nombres = d.nombres?.trim();
      const apellidos = [d.apellido1, d.apellido2].filter(Boolean).join(' ').trim();
      if (nombres) form.setValue('firstName', nombres, { shouldValidate: true });
      if (apellidos) form.setValue('lastName', apellidos, { shouldValidate: true });
      if (d.fechaNacimiento) {
        // "2013-06-20T00:00:00" -> "2013-06-20" para <input type="date">
        form.setValue('birthDate', d.fechaNacimiento.slice(0, 10), { shouldValidate: true });
      }
    },
  });

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!open) {
      form.reset();
      setDuplicateFound(null);
      setAcknowledgedDuplicate(false);
      dinardap.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  async function checkDuplicate(idCardValue: string) {
    if (!idCardValue.trim() || idCardValue.trim().length < 3) {
      setDuplicateFound(null);
      return;
    }
    setIsCheckingDuplicate(true);
    try {
      const resp = await PersonasAPI.listPaged({ page: 1, pageSize: 5, search: idCardValue.trim() });
      if (resp.status === 'success') {
        const items: PersonDto[] = resp.data?.items ?? [];
        const exact = items.find(
          (p) => p.idCard?.trim().toLowerCase() === idCardValue.trim().toLowerCase()
        );
        if (exact) {
          setDuplicateFound({
            name: `${exact.firstName ?? ''} ${exact.lastName ?? ''}`.trim(),
            idCard: exact.idCard ?? '',
          });
          setAcknowledgedDuplicate(false);
        } else {
          setDuplicateFound(null);
        }
      }
    } finally {
      setIsCheckingDuplicate(false);
    }
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      PersonasAPI.create({
        firstName: values.firstName,
        lastName: values.lastName,
        identType: values.identType,
        idCard: values.idCard,
        email: values.email,
        phone: values.phone || undefined,
        birthDate: values.birthDate || undefined,
        preferredDenomination: values.preferredDenomination?.trim() || undefined,
        isActive: true,
      }),
    onSuccess: (resp) => {
      if (resp.status === 'success' && resp.data) {
        toast({ title: 'Persona registrada exitosamente.' });
        onCreated(resp.data as PersonDto);
        form.reset();
      } else {
        const msg = resp.status === 'error' ? resp.error.message : 'Error al registrar la persona.';
        toast({ variant: 'destructive', title: 'Error', description: msg });
      }
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al registrar la persona.' }),
  });

  const submitDisabled =
    mutation.isPending || dinardap.isChecking || (duplicateFound !== null && !acknowledgedDuplicate);

  // Bloqueado solo si DINARDAP respondió Y trajo un valor real para ese campo puntual - si
  // vino null (DINARDAP no tiene el dato) o el servicio no respondió, queda editable.
  const nombresLocked = dinardap.status === 'found' && !!dinardap.data?.nombres?.trim();
  const apellidosLocked = dinardap.status === 'found' && !!(dinardap.data?.apellido1 || dinardap.data?.apellido2);
  const fechaNacimientoLocked = dinardap.status === 'found' && !!dinardap.data?.fechaNacimiento;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Persona</DialogTitle>
          <DialogDescription>
            Ingresa la cédula para verificar contra Registro Civil y completa los datos básicos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombres *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={mutation.isPending || nombresLocked || dinardap.isChecking} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellidos *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={mutation.isPending || apellidosLocked || dinardap.isChecking} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="identType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de documento *</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        // Al cambiar tipo, limpiar resultado de duplicado
                        setDuplicateFound(null);
                        setAcknowledgedDuplicate(false);
                      }}
                      disabled={mutation.isPending || dinardap.isChecking}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {IDENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={String(t.value)}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="idCard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° Documento *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={mutation.isPending}
                        onChange={(e) => {
                          field.onChange(e);
                          // Limpiar duplicado y auto-relleno al editar la cédula
                          setDuplicateFound(null);
                          setAcknowledgedDuplicate(false);
                          dinardap.reset();
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          checkDuplicate(e.target.value);
                          dinardap.check(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {dinardap.status === 'checking' && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Consultando Registro Civil…
                      </p>
                    )}
                    {dinardap.status === 'found' && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Verificado con Registro Civil
                      </p>
                    )}
                    {dinardap.status === 'not-found' && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Datos no encontrados en Registro Civil para esta cédula — completa manualmente.
                      </p>
                    )}
                    {dinardap.status === 'unavailable' && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <ServerCrash className="h-3 w-3" />
                        Servicio DINARDAP en mantenimiento o no disponible — completa manualmente.
                      </p>
                    )}
                    {dinardap.status === 'error' && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        No se pudo verificar con Registro Civil — completa manualmente.
                      </p>
                    )}
                    {isCheckingDuplicate && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verificando duplicado…
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {/* Alerta de duplicado */}
            {duplicateFound && (
              <Alert variant="destructive" className="py-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs space-y-2">
                  <p>
                    Ya existe una persona registrada con este documento:{' '}
                    <strong>{duplicateFound.name}</strong> — {duplicateFound.idCard}.
                    Busca esa persona en el buscador en lugar de crear un duplicado.
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ack-dup"
                      checked={acknowledgedDuplicate}
                      onCheckedChange={(v) => setAcknowledgedDuplicate(!!v)}
                    />
                    <label htmlFor="ack-dup" className="cursor-pointer text-xs font-medium">
                      Es una persona diferente con el mismo documento (continuar de todas formas)
                    </label>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={mutation.isPending || dinardap.isChecking} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredDenomination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Denominación Formal (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder='Ej: "Dra. Sara Camacho Estrada, PhD."'
                      disabled={mutation.isPending || dinardap.isChecking}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Solo afecta cómo aparece el nombre al firmar Acciones de Personal o Contratos.
                    Se puede completar ahora o después desde Personas.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Nacimiento *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={mutation.isPending || fechaNacimientoLocked || dinardap.isChecking} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={mutation.isPending || dinardap.isChecking} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitDisabled}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
