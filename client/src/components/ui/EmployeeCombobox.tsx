// src/components/ui/EmployeeCombobox.tsx
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VistaDetallesEmpleadosAPI, DepartmentAuthoritiesAPI } from '@/lib/api';
import type { ApiResponse } from '@/lib/api';
import type { PagedResult } from '@/lib/api/core/pagination';

type Props = {
  value: number | null;
  onSelect: (employeeId: number | null) => void;
  onSelectEmployee?: (emp: any) => void;
  disabled?: boolean;
  placeholder?: string;
  /**
   * Búsqueda alterna al buscador genérico de HR.vw_EmployeeDetails (ej. para filtrar solo
   * empleados con cierto cargo). Si se omite, usa VistaDetallesEmpleadosAPI.listPaged.
   */
  searchFn?: (search: string) => Promise<ApiResponse<any[] | PagedResult<any>>>;
  /** Clave de caché única cuando se usa searchFn (para no compartir caché con el buscador genérico). */
  searchKey?: string;
  /**
   * Muestra una etiqueta "Autoridad vigente: <tipo>" junto a los empleados que tienen una
   * autoridad activa en HR.tbl_DepartmentAuthorities (Rector, Decano, Director, etc.).
   * Pensado para selectores de responsables de documentos, donde importa distinguir a simple
   * vista si la persona elegida sigue vigente en su cargo de autoridad. Opt-in: no afecta a
   * los demás usos de este combobox.
   */
  showAuthorityBadge?: boolean;
};

/**
 * Combobox de búsqueda de empleados sobre la vista EmployeeDetails.
 * Muestra cédula · cargo · nombre completo en cada opción.
 * Soporta limpiar la selección (→ null).
 */
export function EmployeeCombobox({
  value,
  onSelect,
  onSelectEmployee,
  disabled,
  placeholder = '— Sin especificar —',
  searchFn,
  searchKey = 'employee-details-search',
  showAuthorityBadge = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  // Si el valor se limpia externamente, limpiar la etiqueta local
  useEffect(() => {
    if (!value) setSelectedLabel(null);
  }, [value]);

  // Al editar un registro existente, `value` llega ya seteado desde el padre sin que el
  // usuario haya buscado/seleccionado nada en esta sesión — sin esto se mostraría
  // "Empleado #<id>" en vez del nombre real. Se resuelve una sola vez por id.
  const { data: resolvedData } = useQuery({
    queryKey: ['employee-details-resolve', value],
    queryFn: () => VistaDetallesEmpleadosAPI.get(value as number),
    enabled: !!value && !selectedLabel,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (resolvedData?.status === 'success' && resolvedData.data) {
      const emp = resolvedData.data as any;
      setSelectedLabel(emp.fullName ?? `Empleado #${value}`);
    }
  }, [resolvedData, value]);

  const { data, isFetching } = useQuery({
    queryKey: [searchKey, debouncedSearch],
    queryFn: () =>
      searchFn
        ? searchFn(debouncedSearch)
        : VistaDetallesEmpleadosAPI.listPaged({ page: 1, pageSize: 15, search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2,
    staleTime: 15_000,
  });

  // Autoridades vigentes (Rector, Decano, Director, etc.) — solo se pide cuando el padre
  // pide la etiqueta, y se cachea 1 minuto ya que cambia con poca frecuencia.
  const { data: authoritiesData } = useQuery({
    queryKey: ['active-authorities-badge'],
    queryFn: () => DepartmentAuthoritiesAPI.listActiveFromView(),
    enabled: showAuthorityBadge,
    staleTime: 60_000,
  });

  const authorityByEmployeeId = new Map<number, string>();
  if (authoritiesData?.status === 'success' && authoritiesData.data) {
    for (const a of authoritiesData.data) {
      if (!authorityByEmployeeId.has(a.employeeID)) {
        authorityByEmployeeId.set(a.employeeID, a.denomination || a.authorityTypeName);
      }
    }
  }

  const employees: any[] = data?.status === 'success'
    ? (Array.isArray(data.data) ? data.data : (data.data?.items ?? []))
    : [];
  const hasSearched = debouncedSearch.length >= 2;

  const handleSelect = (emp: any) => {
    const id: number = emp.employeeID ?? emp.employeeId;
    const name: string = emp.fullName ?? `Empleado #${id}`;
    setSelectedLabel(name);
    onSelect(id);
    onSelectEmployee?.(emp);
    setOpen(false);
    setSearch('');
    setDebouncedSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLabel(null);
    onSelect(null);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setSearch('');
      setDebouncedSearch('');
    }
  };

  return (
    <Popover open={open && !disabled} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span
            className={cn(
              'truncate text-left flex-1',
              !selectedLabel && !value && 'text-muted-foreground'
            )}
          >
            {selectedLabel ?? (value ? `Empleado #${value}` : placeholder)}
          </span>
          <span className="flex items-center ml-2 shrink-0">
            {value && !disabled && (
              <X
                className="h-3.5 w-3.5 opacity-50 hover:opacity-100 mr-1"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        side="bottom"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nombre, cédula o cargo…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isFetching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isFetching && !hasSearched && (
              <div className="py-5 text-center text-sm text-muted-foreground">
                Escribe al menos 2 caracteres para buscar.
              </div>
            )}

            {!isFetching && hasSearched && employees.length === 0 && (
              <CommandEmpty>Sin resultados para "{debouncedSearch}".</CommandEmpty>
            )}

            {!isFetching &&
              employees.map((emp) => {
                const id: number = emp.employeeID ?? emp.employeeId;
                return (
                  <CommandItem
                    key={id}
                    value={String(id)}
                    onSelect={() => handleSelect(emp)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{emp.fullName}</p>
                        {showAuthorityBadge && authorityByEmployeeId.has(id) && (
                          <Badge variant="success" className="shrink-0 whitespace-nowrap">
                            Autoridad vigente: {authorityByEmployeeId.get(id)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {[emp.idCard, emp.email].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </CommandItem>
                );
              })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
