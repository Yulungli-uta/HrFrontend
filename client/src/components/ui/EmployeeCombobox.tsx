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
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VistaDetallesEmpleadosAPI } from '@/lib/api';

type Props = {
  value: number | null;
  onSelect: (employeeId: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Combobox de búsqueda de empleados sobre la vista EmployeeDetails.
 * Muestra cédula · cargo · nombre completo en cada opción.
 * Soporta limpiar la selección (→ null).
 */
export function EmployeeCombobox({
  value,
  onSelect,
  disabled,
  placeholder = '— Sin especificar —',
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

  const { data, isFetching } = useQuery({
    queryKey: ['employee-details-search', debouncedSearch],
    queryFn: () =>
      VistaDetallesEmpleadosAPI.listPaged({ page: 1, pageSize: 15, search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2,
    staleTime: 15_000,
  });

  const employees: any[] = data?.status === 'success' ? (data.data?.items ?? []) : [];
  const hasSearched = debouncedSearch.length >= 2;

  const handleSelect = (emp: any) => {
    const id: number = emp.employeeID ?? emp.employeeId;
    const name: string = emp.fullName ?? `Empleado #${id}`;
    setSelectedLabel(name);
    onSelect(id);
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
                    <div className="min-w-0">
                      <p className="font-medium truncate">{emp.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[emp.idCard, emp.jobName].filter(Boolean).join(' · ')}
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
