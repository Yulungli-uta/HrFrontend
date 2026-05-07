// src/components/departments/DepartmentSelect.tsx
import { useState, useMemo } from 'react';
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
import { Check, ChevronsUpDown, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VwDepartmentWithTypeAPI } from '@/lib/api';
import type { VwDepartmentWithType } from '@/lib/api';

type Props = {
  value: number | null;
  onChange: (value: number | null, dept: VwDepartmentWithType | null) => void;
  disabled?: boolean;
  placeholder?: string;
  departmentScopeId?: number | null;
  className?: string;
};

export function DepartmentSelect({
  value,
  onChange,
  disabled,
  placeholder = 'Seleccionar departamento…',
  departmentScopeId,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['vw-departments-select', departmentScopeId ?? 'all'],
    queryFn: () =>
      departmentScopeId
        ? VwDepartmentWithTypeAPI.getByScope(departmentScopeId)
        : VwDepartmentWithTypeAPI.getActive(),
    staleTime: 60_000,
  });

  const allDepts: VwDepartmentWithType[] =
    data?.status === 'success' ? (data.data ?? []) : [];

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return allDepts;
    return allDepts.filter(
      (d) =>
        d.departmentName.toLowerCase().includes(term) ||
        d.code.toLowerCase().includes(term) ||
        (d.departmentTypeName?.toLowerCase().includes(term) ?? false) ||
        (d.departmentScopeName?.toLowerCase().includes(term) ?? false)
    );
  }, [allDepts, search]);

  const selected = allDepts.find((d) => d.departmentID === value) ?? null;
  const displayLabel = selected
    ? selected.departmentName
    : value
      ? `Departamento #${value}`
      : null;

  const handleSelect = (dept: VwDepartmentWithType) => {
    onChange(dept.departmentID, dept);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange(null, null);
    setOpen(false);
    setSearch('');
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setSearch('');
  };

  return (
    <Popover open={open && !disabled} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className={cn('truncate text-left flex-1', !displayLabel && 'text-muted-foreground')}>
            {displayLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" side="bottom">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar departamento…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isFetching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isFetching && (
              <>
                <CommandItem
                  value="__none__"
                  onSelect={handleClear}
                  className="cursor-pointer italic text-muted-foreground"
                >
                  <Check className={cn('mr-2 h-4 w-4 shrink-0', !value ? 'opacity-100' : 'opacity-0')} />
                  Sin departamento
                </CommandItem>

                {filtered.length === 0 && search.trim() && (
                  <CommandEmpty>Sin resultados para "{search}".</CommandEmpty>
                )}

                {filtered.map((d) => (
                  <CommandItem
                    key={d.departmentID}
                    value={String(d.departmentID)}
                    onSelect={() => handleSelect(d)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === d.departmentID ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <p className="font-medium truncate">{d.departmentName}</p>
                        {d.code && (
                          <span className="text-xs text-muted-foreground shrink-0">({d.code})</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.departmentTypeName ?? 'Sin tipo'}
                        {' · '}
                        {d.departmentScopeName ?? 'Sin ámbito'}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
