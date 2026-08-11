// client/src/components/person-detail/forms/BankAccountForm.tsx
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { BankAccount } from "@/types/person";
import { TiposReferenciaAPI, type RefType } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { logger } from "@/lib/logger";

const bankAccountFormSchema = z.object({
  accountTypeId: z
    .number({
      required_error: "El tipo de cuenta es requerido",
      invalid_type_error: "El tipo de cuenta es requerido",
    })
    .int()
    .positive(),
  financialInstitution: z.string().min(1, "La entidad financiera es requerida"),
  accountNumber: z
    .string()
    .min(5, "El número de cuenta parece muy corto")
    .regex(/^\d+$/, "El número de cuenta solo debe contener dígitos"),
});

export type BankAccountFormData = z.infer<typeof bankAccountFormSchema>;

function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
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
    data: accountTypesResp,
    isLoading: loadingAccountTypes,
    error: accountTypesError,
  } = useQuery({
    queryKey: ["refTypes", "BANK_ACCOUNT_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.BANK_ACCOUNT_TYPE),
  });

  const accountTypes: RefType[] =
    accountTypesResp?.status === "success"
      ? (accountTypesResp.data ?? []).filter((t: any) => t.isActive)
      : [];

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues: {
      accountTypeId: bankAccount?.accountTypeId != null ? Number(bankAccount.accountTypeId) : 0,
      financialInstitution: bankAccount?.financialInstitution ?? "",
      accountNumber: bankAccount?.accountNumber ?? "",
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
      financialInstitution: bankAccount?.financialInstitution ?? "",
      accountNumber: bankAccount?.accountNumber ?? "",
    });
  }, [bankAccount, form]);

  const handleSubmit = async (data: BankAccountFormData) => {
    const payload = {
      accountId: bankAccount?.accountId ?? 0,
      personId,
      accountTypeId: data.accountTypeId,
      financialInstitution: data.financialInstitution,
      accountNumber: data.accountNumber,
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
            name="financialInstitution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entidad financiera</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: Banco Pichincha" autoComplete="off" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de cuenta</FormLabel>
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
              <FormLabel>Número de cuenta</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: 2200123456" autoComplete="off" />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Asegúrese de copiar exactamente el número de su libreta o estado de cuenta.
              </p>
              <FormMessage />
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
