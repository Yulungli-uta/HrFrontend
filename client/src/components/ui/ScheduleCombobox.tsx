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
import { HorariosAPI } from '@/lib/api';

type Props = {
  value: number | null;
  onSelect: (scheduleId: number | null, schedule?: any) => void;
  label?: string | null;
  disabled?: boolean;
  placeholder?: string;
};

function fmtTime(t: string | null | undefined) {
  return t ? t.slice(0, 5) : '—';
}

function isOvernight(entry: string | null | undefined, exit: string | null | undefined) {
  if (!entry || !exit) return false;
  return exit.slice(0, 5) <= entry.slice(0, 5);
}

export function ScheduleCombobox({
  value,
  onSelect,
  label,
  disabled,
  placeholder = '— Sin horario —',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [internalLabel, setInternalLabel] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  useEffect(() => { if (!value) setInternalLabel(null); }, [value]);

  const { data, isFetching } = useQuery({
    queryKey: ['schedules-combobox', debouncedSearch],
    queryFn: () =>
      HorariosAPI.listPaged({ page: 1, pageSize: 20, search: debouncedSearch || undefined }),
    enabled: open,
    staleTime: 60_000,
  });

  const schedules: any[] = data?.status === 'success' ? (data.data?.items ?? []) : [];

  const buildLabel = (s: any) => {
    const overnight = isOvernight(s.entryTime, s.exitTime);
    return `${s.description} · ${fmtTime(s.entryTime)}–${fmtTime(s.exitTime)}${overnight ? ' (+1)' : ''}`;
  };

  const handleSelect = (s: any) => {
    setInternalLabel(buildLabel(s));
    onSelect(s.scheduleId, s);
    setOpen(false);
    setSearch('');
    setDebouncedSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalLabel(null);
    onSelect(null);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) { setSearch(''); setDebouncedSearch(''); }
  };

  const displayLabel = internalLabel ?? label ?? (value ? `Horario #${value}` : null);

  return (
    <Popover open={open && !disabled} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal h-8 text-sm"
        >
          <span className={cn('truncate text-left flex-1', !displayLabel && 'text-muted-foreground')}>
            {displayLabel ?? placeholder}
          </span>
          <span className="flex items-center ml-1 shrink-0">
            {value && !disabled && (
              <X className="h-3 w-3 opacity-50 hover:opacity-100 mr-1" onClick={handleClear} />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start" side="bottom">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por descripción…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isFetching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isFetching && schedules.length === 0 && (
              <CommandEmpty>
                {debouncedSearch
                  ? `Sin resultados para "${debouncedSearch}".`
                  : 'No hay horarios disponibles.'}
              </CommandEmpty>
            )}
            {!isFetching && schedules.map((s) => {
              const overnight = isOvernight(s.entryTime, s.exitTime);
              return (
                <CommandItem
                  key={s.scheduleId}
                  value={String(s.scheduleId)}
                  onSelect={() => handleSelect(s)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === s.scheduleId ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-sm">{s.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtTime(s.entryTime)} – {fmtTime(s.exitTime)}
                      {overnight && (
                        <span className="ml-1 text-orange-500 font-medium">+1 día</span>
                      )}
                      {s.workingDays && (
                        <span className="ml-2 opacity-60">{s.workingDays}</span>
                      )}
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
