// client/src/components/person-detail/forms/BankAccountForm.tsx
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { BankAccount } from "@/types/person";
import { type RefType } from "@/lib/api";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { logger } from "@/lib/logger";

// Hallazgo informe UTA-DITIC-PS-027-2026, observación 42: antes "Entidad
// financiera" era texto libre; ahora es un combo (ref_Types BANK_INSTITUTION)
// con "Otro" como fallback a texto libre. El valor que se envía al backend
// sigue siendo financialInstitution (string) en ambos casos - no cambia el
// contrato con el backend.
const OTHER_BANK_OPTION = "__OTHER__";

const bankAccountFormSchema = z.object({
  accountTypeId: z
    .number({
      required_error: "El tipo de cuenta es requerido",
      invalid_type_error: "El tipo de cuenta es requerido",
    })
    .int()
    .positive(),
  bankSelection: z.string().min(1, "La entidad financiera es requerida"),
  financialInstitutionOther: z.string().optional(),
  accountNumber: z
    .string()
    .min(5, "El número de cuenta parece muy corto")
    .max(50, "El número de cuenta no puede exceder 50 dígitos")
    .regex(/^\d+$/, "El número de cuenta solo debe contener dígitos"),
  // Hallazgo informe UTA-DITIC-PS-027-2026, observación 44: como máximo una cuenta
  // "Principal" por persona (no "activa" — puede haber varias cuentas, solo una principal).
  // Sin .default(): con default(), z.infer vuelve el campo opcional en el tipo de entrada
  // pero requerido en el de salida, lo que rompe la inferencia de zodResolver aquí (a
  // diferencia de FamilyMemberForm, este useForm no usa "as any" en el resolver).
  isPrimary: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.bankSelection === OTHER_BANK_OPTION) {
    const other = data.financialInstitutionOther?.trim();
    if (!other) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["financialInstitutionOther"],
        message: "Escriba el nombre de la entidad financiera",
      });
    } else if (other.length > 150) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["financialInstitutionOther"],
        message: "La entidad financiera no puede exceder 150 caracteres",
      });
    }
  }
});

export type BankAccountFormData = z.infer<typeof bankAccountFormSchema>;

function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

function resolveBankDefaults(financialInstitution: string | undefined, banks: RefType[]) {
  const name = financialInstitution?.trim();
  if (!name) return { bankSelection: "", financialInstitutionOther: "" };
  const match = banks.find((b: any) => (b.name ?? "").trim().toLowerCase() === name.toLowerCase());
  if (match) {
    return { bankSelection: String(getRefTypeId(match)), financialInstitutionOther: "" };
  }
  return { bankSelection: OTHER_BANK_OPTION, financialInstitutionOther: name };
}

interface BankAccountFormProps {
  personId: number;
  bankAccount?: BankAccount | null;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function BankAccountForm({
  personId,
  bankAccount,
  onSubmit,
  onCancel,
  isLoading = false,
  onDirtyChange,
}: BankAccountFormProps) {
  const {
    data: accountTypesRaw,
    isLoading: loadingAccountTypes,
    error: accountTypesError,
  } = useRefTypesByCategory(REF_TYPE_CATEGORIES.BANK_ACCOUNT_TYPE);

  const accountTypes: RefType[] = accountTypesRaw.filter((t: any) => t.isActive);

  const {
    data: banksRaw,
    isLoading: loadingBanks,
    error: banksError,
  } = useRefTypesByCategory(REF_TYPE_CATEGORIES.BANK_INSTITUTION);
  const banks: RefType[] = banksRaw.filter((t: any) => t.isActive && (t as any).name !== "Otro");

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountFormSchema),
    mode: "onTouched",
    defaultValues: {
      accountTypeId: bankAccount?.accountTypeId != null ? Number(bankAccount.accountTypeId) : 0,
      ...resolveBankDefaults(bankAccount?.financialInstitution, banks),
      accountNumber: bankAccount?.accountNumber ?? "",
      isPrimary: (bankAccount as any)?.isPrimary ?? false,
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  const _isDirty = form.formState.isDirty;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_isDirty);
  }, [_isDirty]);

  useEffect(() => {
    form.reset({
      accountTypeId: bankAccount?.accountTypeId != null ? Number(bankAccount.accountTypeId) : 0,
      ...resolveBankDefaults(bankAccount?.financialInstitution, banks),
      accountNumber: bankAccount?.accountNumber ?? "",
      isPrimary: (bankAccount as any)?.isPrimary ?? false,
    });
    // banks solo se necesita la primera vez que carga (para resolver el default);
    // no se re-ejecuta en cada refetch para no pisar lo que el usuario está escribiendo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccount, form]);

  const bankSelection = form.watch("bankSelection");

  const handleSubmit = async (data: BankAccountFormData) => {
    const selectedBank = banks.find((b: any) => String(getRefTypeId(b)) === data.bankSelection);
    const financialInstitution =
      data.bankSelection === OTHER_BANK_OPTION
        ? (data.financialInstitutionOther ?? "").trim()
        : (selectedBank as any)?.name ?? "";

    const payload = {
      accountId: bankAccount?.accountId ?? 0,
      personId,
      accountTypeId: data.accountTypeId,
      financialInstitution,
      accountNumber: data.accountNumber,
      isPrimary: data.isPrimary,
    };

    try {
      await onSubmit(payload);
      if (!bankAccount) form.reset();
    } catch (error) {
      logger.error("BankAccountForm", "[BankAccountForm] onSubmit ERROR", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" data-testid="bank-account-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bankSelection"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Entidad financiera</FormLabel>
                <Select
                  disabled={loadingBanks || !!banksError || isLoading}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-financial-institution">
                      <SelectValue placeholder={loadingBanks ? "Cargando entidades..." : "Seleccionar entidad"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {banks.map((b) => {
                      const id = getRefTypeId(b);
                      if (id == null) return null;
                      return (
                        <SelectItem key={id} value={String(id)}>
                          {(b as any).name}
                        </SelectItem>
                      );
                    })}
                    <SelectItem value={OTHER_BANK_OPTION}>Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {bankSelection === OTHER_BANK_OPTION && (
            <FormField
              control={form.control}
              name="financialInstitutionOther"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nombre de la entidad</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={150} placeholder="Ej: Banco Pichincha" autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="accountTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Tipo de cuenta</FormLabel>
                <Select
                  disabled={loadingAccountTypes || !!accountTypesError || isLoading}
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-account-type">
                      <SelectValue placeholder={loadingAccountTypes ? "Cargando tipos..." : "Seleccionar tipo"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accountTypes.map((t) => {
                      const id = getRefTypeId(t);
                      if (id == null) return null;
                      return (
                        <SelectItem key={id} value={String(id)}>
                          {t.name ?? `Tipo ${id}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Número de cuenta</FormLabel>
              <FormControl>
                <Input {...field} maxLength={50} placeholder="Ej: 2200123456" autoComplete="off" />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Asegúrese de copiar exactamente el número de su libreta o estado de cuenta.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPrimary"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                  data-testid="checkbox-is-primary"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Cuenta principal</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Solo puede haber una cuenta principal. Si marcas esta, se desmarcará
                  automáticamente cualquier otra cuenta principal que tengas registrada.
                </p>
              </div>
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-2 pt-4 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || loadingAccountTypes} data-testid="button-submit">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? "Guardando..." : bankAccount ? "Actualizar" : "Registrar cuenta"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
