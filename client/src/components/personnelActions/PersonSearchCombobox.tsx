// src/components/personnelActions/PersonSearchCombobox.tsx
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
import { Check, ChevronsUpDown, UserPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PersonasAPI } from '@/lib/api';
import type { PersonDto } from '@/lib/api';
import { PersonCreateDialog } from './PersonCreateDialog';

type Props = {
  /** ID actualmente seleccionado */
  value: number | null;
  /** Etiqueta a mostrar cuando el control está deshabilitado (modo edición) */
  staticLabel?: string | null;
  /** Callback que recibe el personId y el objeto completo al seleccionar */
  onSelect: (personId: number, person: PersonDto) => void;
  disabled?: boolean;
};

export function PersonSearchCombobox({ value, staticLabel, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  // Guardamos el objeto seleccionado para persistir el nombre aunque se limpie la búsqueda
  const [selectedPerson, setSelectedPerson] = useState<PersonDto | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  // Si value se limpia externamente, limpiar también el estado local
  useEffect(() => {
    if (!value) setSelectedPerson(null);
  }, [value]);

  const { data, isFetching } = useQuery({
    queryKey: ['people-search', debouncedSearch],
    queryFn: () => PersonasAPI.listPaged({ page: 1, pageSize: 10, search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2,
    staleTime: 15_000,
  });

  const people: PersonDto[] = data?.status === 'success' ? (data.data?.items ?? []) : [];
  const hasSearched = debouncedSearch.length >= 2;

  // Etiqueta que se muestra en el botón trigger
  const displayLabel =
    staticLabel ??
    (selectedPerson
      ? `${selectedPerson.firstName} ${selectedPerson.lastName}`
      : value
        ? `Persona #${value}`
        : null);

  const handleSelect = (person: PersonDto) => {
    setSelectedPerson(person);
    onSelect(person.personId, person);
    setOpen(false);
    setSearch('');
    setDebouncedSearch('');
  };

  const handleCreated = (person: PersonDto) => {
    handleSelect(person);
    setCreateOpen(false);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setSearch('');
      setDebouncedSearch('');
    }
  };

  return (
    <>
      <Popover open={open && !disabled} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn('truncate text-left flex-1', !displayLabel && 'text-muted-foreground')}>
              {displayLabel ?? 'Buscar persona…'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          side="bottom"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Nombre, apellido o cédula…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {/* Cargando */}
              {isFetching && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Instrucción inicial */}
              {!isFetching && !hasSearched && (
                <div className="py-5 text-center text-sm text-muted-foreground">
                  Escribe al menos 2 caracteres para buscar.
                </div>
              )}

              {/* Sin resultados → botón crear */}
              {!isFetching && hasSearched && people.length === 0 && (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-3 py-3">
                    <p className="text-sm text-muted-foreground">
                      Sin resultados para "{debouncedSearch}".
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        setCreateOpen(true);
                      }}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Registrar Nueva Persona
                    </Button>
                  </div>
                </CommandEmpty>
              )}

              {/* Resultados */}
              {!isFetching &&
                people.map((p) => (
                  <CommandItem
                    key={p.personId}
                    value={String(p.personId)}
                    onSelect={() => handleSelect(p)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === p.personId ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.idCard}</p>
                    </div>
                  </CommandItem>
                ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <PersonCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </>
  );
}
