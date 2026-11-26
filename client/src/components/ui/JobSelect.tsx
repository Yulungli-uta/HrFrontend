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
import { Check, ChevronsUpDown, Briefcase, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarqueeText } from '@/components/ui/marquee-text';
import { VwJobWithDegreeAndGroupAPI } from '@/lib/api';
import type { VwJobWithDegreeAndGroup } from '@/lib/api';

type Props = {
  value: number | null;
  onChange: (value: number | null, job: VwJobWithDegreeAndGroup | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

/** Línea de detalle de un cargo: tipo · grupo (escala) · RMU. */
function detailOf(j: VwJobWithDegreeAndGroup): string {
  const scale = j.uepScaleName && !/uep/i.test(j.occupationalGroup ?? '') ? ` (${j.uepScaleName})` : '';
  const rmu = j.rmu != null ? j.rmu.toLocaleString('es-EC', { minimumFractionDigits: 2 }) : '—';
  return `${j.jobTypeName ?? '—'} · ${j.occupationalGroup ?? '—'}${scale} · RMU ${rmu}`;
}

export function JobSelect({
  value,
  onChange,
  disabled,
  placeholder = 'Seleccionar cargo…',
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['vw-jobs-select', 'all'],
    queryFn: () => VwJobWithDegreeAndGroupAPI.getAll(),
    staleTime: 60_000,
  });

  const allJobs: VwJobWithDegreeAndGroup[] =
    data?.status === 'success' ? (data.data ?? []) : [];

  // La lista no ofrece cargos inactivos; el ya asignado sigue visible en el botón (se busca en allJobs).
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    const offered = allJobs.filter((j) => j.jobIsActive !== false);
    if (!term) return offered;
    return offered.filter(
      (j) =>
        (j.jobDescription?.toLowerCase().includes(term) ?? false) ||
        (j.jobTypeName?.toLowerCase().includes(term) ?? false) ||
        (j.occupationalGroup?.toLowerCase().includes(term) ?? false)
    );
  }, [allJobs, search]);

  const selected = allJobs.find((j) => j.jobID === value) ?? null;
  const displayLabel = selected
    ? selected.jobDescription ?? `Cargo #${value}`
    : value
    ? `Cargo #${value}`
    : null;

  const handleSelect = (job: VwJobWithDegreeAndGroup) => {
    onChange(job.jobID, job);
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
          className={cn('group w-full min-w-0 max-w-full justify-between font-normal', className)}
        >
          <MarqueeText title={displayLabel ?? undefined} className={cn('text-left flex-1', !displayLabel && 'text-muted-foreground')}>
            {displayLabel ?? placeholder}
          </MarqueeText>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      {/* Mínimo el ancho del botón; crece hasta 32rem (90 % de la pantalla en móvil) para leer los nombres largos. */}
      <PopoverContent className="w-max min-w-[--radix-popover-trigger-width] max-w-[min(32rem,90vw)] p-0" align="start" side="bottom">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar cargo…"
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
                  Sin cargo
                </CommandItem>

                {filtered.length === 0 && search.trim() && (
                  <CommandEmpty>Sin resultados para "{search}".</CommandEmpty>
                )}

                {filtered.map((j) => (
                  <CommandItem
                    key={j.jobID}
                    value={String(j.jobID)}
                    onSelect={() => handleSelect(j)}
                    className="group cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === j.jobID ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <MarqueeText title={j.jobDescription ?? `Cargo #${j.jobID}`} className="font-medium">
                          {j.jobDescription ?? `Cargo #${j.jobID}`}
                        </MarqueeText>
                      </div>
                      <MarqueeText title={detailOf(j)} className="text-xs text-muted-foreground">
                        {detailOf(j)}
                      </MarqueeText>
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
