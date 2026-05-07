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
import { VwJobWithDegreeAndGroupAPI } from '@/lib/api';
import type { VwJobWithDegreeAndGroup } from '@/lib/api';

type Props = {
  value: number | null;
  onChange: (value: number | null, job: VwJobWithDegreeAndGroup | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

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

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return allJobs;
    return allJobs.filter(
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
                    className="cursor-pointer"
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
                        <p className="font-medium truncate">
                          {j.jobDescription ?? `Cargo #${j.jobID}`}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {j.jobTypeName ?? '—'}
                        {' · '}
                        {j.occupationalGroup ?? '—'}
                        {' · RMU '}
                        {j.rmu != null ? j.rmu.toLocaleString('es-EC', { minimumFractionDigits: 2 }) : '—'}
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
