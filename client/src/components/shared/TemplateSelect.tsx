// src/components/shared/TemplateSelect.tsx
// Selector genérico de plantilla documental vigente. Reusado en ContractTypeForm y
// PersonnelActionTypeForm: siempre muestra solo la versión Publicada (vigente) de cada
// código de plantilla del tipo indicado, nunca versiones Draft/Archived. Cambiar este
// componente corrige el comportamiento en ambos formularios a la vez.
//
// Combobox con filtro tipo-mientras-escribes (Popover + Command), siguiendo el mismo
// patrón ya usado en DepartmentSelect/SearchableSelect, en vez de un <Select> simple.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command, CommandEmpty, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DocumentTemplatesAPI } from '@/lib/api/services/documentTemplates';

interface Props {
  /** Categoría de plantilla a mostrar, ej: "CONTRATO", "ACCION_PERSONAL". */
  templateType: string;
  /** TemplateId seleccionado, o null/undefined si no hay ninguno. */
  value: number | null | undefined;
  onChange: (templateId: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Permite limpiar la selección (agrega opción "Sin plantilla"). */
  allowNone?: boolean;
}

const NONE_VALUE = '__none__';

export function TemplateSelect({
  templateType, value, onChange, placeholder = 'Seleccionar plantilla...', disabled, allowNone = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['templates-current', templateType],
    queryFn: () => DocumentTemplatesAPI.getAll({ templateType, status: 'Published' }),
    enabled: !!templateType,
  });

  const options = data?.status === 'success' ? data.data : [];

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return options;
    return options.filter((t) => {
      const name = t.name?.toLowerCase() ?? '';
      const version = String(t.version ?? '').toLowerCase();
      const code = t.templateCode?.toLowerCase() ?? '';
      return name.includes(term) || version.includes(term) || code.includes(term);
    });
  }, [options, search]);

  const selected = options.find((t) => t.templateId === value) ?? null;
  const displayLabel = selected ? `${selected.name} (v${selected.version})` : null;

  const handleSelect = (templateId: number) => {
    onChange(templateId === value ? null : templateId);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
    setSearch('');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  return (
    <Popover open={open && !disabled} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between font-normal"
        >
          <span className={cn('flex items-center truncate text-left flex-1', !displayLabel && 'text-muted-foreground')}>
            <FileText className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              {isLoading ? 'Cargando...' : displayLabel ?? placeholder}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" side="bottom">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar plantilla por nombre, código o versión..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && (
              <>
                {allowNone && (
                  <CommandItem
                    value={NONE_VALUE}
                    onSelect={handleClear}
                    className="cursor-pointer italic text-muted-foreground"
                  >
                    <Check className={cn('mr-2 h-4 w-4 shrink-0', !value ? 'opacity-100' : 'opacity-0')} />
                    Sin plantilla
                  </CommandItem>
                )}

                {options.length === 0 && (
                  <CommandEmpty>
                    No hay plantillas publicadas de tipo "{templateType}".
                  </CommandEmpty>
                )}

                {options.length > 0 && filtered.length === 0 && (
                  <CommandEmpty>Sin resultados para "{search}".</CommandEmpty>
                )}

                {filtered.map((t) => (
                  <CommandItem
                    key={t.templateId}
                    value={String(t.templateId)}
                    onSelect={() => handleSelect(t.templateId)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === t.templateId ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{t.name} (v{t.version})</span>
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
