import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Schema robusto para datos bancarios
const bankAccountSchema = z.object({
  personId: z.number(),
  bankName: z.string().min(1, "Selecciona una entidad financiera"),
  accountType: z.enum(["Ahorros", "Corriente"], {
    required_error: "El tipo de cuenta es requerido",
  }),
  accountNumber: z.string()
    .min(5, "El número de cuenta parece muy corto")
    .regex(/^\d+$/, "El número de cuenta solo debe contener dígitos"),
  isPrimary: z.boolean().default(false),
});

export default function BankAccountForm({ personId, onSubmit, onCancel, isLoading }: any) {
  const form = useForm({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      personId,
      bankName: "",
      accountType: "Ahorros", // Default inteligente
      accountNumber: "",
      isPrimary: true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entidad Financiera</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione banco" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* Idealmente esto viene de una API de bancos */}
                    <SelectItem value="Pichincha">Banco Pichincha</SelectItem>
                    <SelectItem value="Pacifico">Banco del Pacífico</SelectItem>
                    <SelectItem value="Guayaquil">Banco Guayaquil</SelectItem>
                    <SelectItem value="Produbanco">Produbanco</SelectItem>
                    <SelectItem value="Internacional">Banco Internacional</SelectItem>
                    <SelectItem value="Austro">Banco del Austro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Cuenta</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Ahorros">Ahorros</SelectItem>
                    <SelectItem value="Corriente">Corriente</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Número de Cuenta</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: 2200123456" autoComplete="off" />
                </FormControl>
                <p className="text-xs text-gray-500">
                   Asegúrese de copiar exactamente el número de su libreta o estado de cuenta.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} type="button">Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Registrar Cuenta"}
          </Button>
        </div>
      </form>
    </Form>
  );
}