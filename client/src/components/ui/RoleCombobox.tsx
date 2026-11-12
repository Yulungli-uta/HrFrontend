// src/components/ui/RoleCombobox.tsx
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RolesAPI } from "@/lib/api";
import type { ApiResponse, PagedResult } from "@/lib/api";
import { usePagedCombobox } from "@/hooks/usePagedCombobox";
import type { ComboboxOption } from "@/hooks/usePagedCombobox";
import type { Role } from "@/features/auth";

type Props = {
  /** Id del rol seleccionado (como texto) o "" si no hay. */
  value: string;
  onChange: (roleId: string) => void;
  /** Roles que no deben ofrecerse (p. ej. los que el usuario ya tiene asignados). */
  excludeRoleIds?: number[];
  disabled?: boolean;
  placeholder?: string;
};

const roleLabel = (role: Pick<Role, "name" | "description">) =>
  role.description ? `${role.name} - ${role.description}` : role.name;

/**
 * Selector de roles con búsqueda y paginación en el servidor, sobre el hook estándar `usePagedCombobox`
 * (búsqueda con espera al escribir, página y totales). Solo ofrece roles activos y no eliminados.
 */
export function RoleCombobox({
  value,
  onChange,
  excludeRoleIds,
  disabled,
  placeholder = "Seleccione un rol",
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // El servicio de seguridad responde a veces con el resultado paginado envuelto una vez más ({ success, data: { items } }).
  const queryFn = useCallback(async (params: { page: number; pageSize: number; search?: string }) => {
    const res: any = await RolesAPI.listPaged(params);
    if (res?.status === "success" && !Array.isArray(res.data?.items) && Array.isArray(res.data?.data?.items)) {
      return { ...res, data: res.data.data } as ApiResponse<PagedResult<Role>>;
    }
    return res as ApiResponse<PagedResult<Role>>;
  }, []);

  const mapFn = useCallback(
    (role: Role): ComboboxOption<Role> | null => {
      if (!role.isActive || role.isDeleted || (excludeRoleIds ?? []).includes(role.id as number)) return null;
      return { value: String(role.id), label: role.name, detail: role.description ?? undefined, raw: role };
    },
    [excludeRoleIds],
  );

  const combobox = usePagedCombobox<Role>({
    queryKey: "role-combobox",
    queryFn,
    mapFn,
    enabled: open,
    initialPageSize: 10,
    debounceMs: 300,
  });

  // Al abrir un registro existente el valor llega ya fijado: se resuelve el nombre una sola vez por id.
  const { data: resolved } = useQuery({
    queryKey: ["role-combobox-resolve", value],
    queryFn: () => RolesAPI.get(Number(value)),
    enabled: !!value && !selectedLabel,
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (resolved?.status === "success" && resolved.data) setSelectedLabel(roleLabel(resolved.data as Role));
  }, [resolved]);
  useEffect(() => {
    if (!value) setSelectedLabel(null);
  }, [value]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) combobox.reset();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{value ? (selectedLabel ?? `Rol #${value}`) : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Escriba para buscar roles…"
            value={combobox.searchTerm}
            onValueChange={combobox.setSearchTerm}
          />
          <CommandList>
            {combobox.isFetching && combobox.options.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
              </div>
            ) : (
              <CommandEmpty>No se encontraron roles.</CommandEmpty>
            )}
            {combobox.options.map((option) => (
              <CommandItem
                key={option.value}
                value={String(option.value)}
                onSelect={() => {
                  setSelectedLabel(option.raw ? roleLabel(option.raw) : option.label);
                  onChange(String(option.value));
                  handleOpenChange(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", String(option.value) === value ? "opacity-100" : "opacity-0")} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{option.label}</p>
                  {option.detail && <p className="truncate text-xs text-muted-foreground">{option.detail}</p>}
                </div>
              </CommandItem>
            ))}
          </CommandList>

          <div className="flex items-center justify-between border-t px-2 py-1.5 text-xs text-muted-foreground">
            <span>
              {combobox.totalCount} rol{combobox.totalCount === 1 ? "" : "es"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={!combobox.hasPreviousPage || combobox.isFetching}
                onClick={combobox.goPrev}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                {combobox.page} / {Math.max(combobox.totalPages, 1)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={!combobox.hasNextPage || combobox.isFetching}
                onClick={combobox.goNext}
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
