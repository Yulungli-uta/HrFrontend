// src/components/contractRequest/ContractRequestPersonSection.tsx
import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, UserCheck, Check, ChevronsUpDown, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandItem, CommandEmpty,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

import { TiposReferenciaAPI, ContractRequestAPI, type ApiResponse } from "@/lib/api";
import type { CreateContractRequestPersonDto, ContractRequestPersonDto, BulkValidatedRow } from "@/types/contractRequestPerson";
import { CargosEspecializadosAPI } from "@/lib/api/services/contracts";
import { PersonSearchCombobox } from "@/components/personnelActions/PersonSearchCombobox";
import { BulkPersonUploadDialog } from "@/components/contractRequest/BulkPersonUploadDialog";

const JOB_TYPE_CATEGORY = "JOB_TYPE";

type PersonRow = CreateContractRequestPersonDto & { _tempId: string; _jobLabel?: string; _personLabel?: string };

function calcMonthsPeriod(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffMs = d2.getTime() - d1.getTime();
  if (diffMs <= 0) return 0;
  return parseFloat((diffMs / (1000 * 60 * 60 * 24 * 30)).toFixed(4));
}

function calcRMU(
  type: "ADMINISTRATIVO" | "DOCENTE" | string,
  jobRmu: number | null | undefined,
  weeklyHours: number | null | undefined,
  hourValue: number | null | undefined
): number {
  if (type === "ADMINISTRATIVO") return jobRmu ?? 0;
  if (type === "DOCENTE") {
    const h = weeklyHours ?? 0;
    const v = hourValue ?? 0;
    return parseFloat((h * v * 4).toFixed(2));
  }
  return 0;
}

export type ContractRequestPersonSectionHandle = {
  getLocalRows(): PersonRow[];
};

type Props = {
  requestId?: number | null;
  headerStartDate?: string | null;
  headerEndDate?: string | null;
  readOnly?: boolean;
  createdBy: number;
};

export const ContractRequestPersonSection = forwardRef<ContractRequestPersonSectionHandle, Props>(
  function ContractRequestPersonSection(
    { requestId, headerStartDate, headerEndDate, readOnly = false, createdBy },
    ref
  ) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [localRows, setLocalRows] = useState<PersonRow[]>([]);
    const [jobSearch, setJobSearch] = useState("");
    const [debouncedJobSearch, setDebouncedJobSearch] = useState("");
    const [jobPopoverOpen, setJobPopoverOpen] = useState(false);
    const [selectedJobLabel, setSelectedJobLabel] = useState<string | null>(null);
    const [selectedPersonLabel, setSelectedPersonLabel] = useState<string | null>(null);
    const jobTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useImperativeHandle(ref, () => ({
      getLocalRows: () => localRows,
    }), [localRows]);

    useEffect(() => {
      if (jobTimerRef.current) clearTimeout(jobTimerRef.current);
      jobTimerRef.current = setTimeout(() => setDebouncedJobSearch(jobSearch.trim()), 300);
      return () => { if (jobTimerRef.current) clearTimeout(jobTimerRef.current); };
    }, [jobSearch]);

    const [form, setForm] = useState<Omit<PersonRow, "_tempId">>({
      requestPersonType: 0,
      jobId: 0,
      startDate: null,
      endDate: null,
      weeklyClassHours: null,
      hourValue: null,
      observation: null,
      createdBy,
      personId: null,
    });

    // Catálogo JOB_TYPE
    const jobTypesQ = useQuery<ApiResponse<any[]>>({
      queryKey: ["refTypes", JOB_TYPE_CATEGORY],
      queryFn: () => TiposReferenciaAPI.byCategory(JOB_TYPE_CATEGORY) as Promise<ApiResponse<any[]>>,
    });
    const jobTypes: any[] = jobTypesQ.data?.status === "success" ? jobTypesQ.data.data : [];

    const selectedTypeName = useMemo(() => {
      if (!form.requestPersonType) return "";
      const t = jobTypes.find((x: any) => {
        const id = x.id ?? x.typeId ?? x.refTypeId;
        return Number(id) === Number(form.requestPersonType);
      });
      return (t?.name ?? "").toUpperCase();
    }, [form.requestPersonType, jobTypes]);

    // Filas del backend (cuando requestId está disponible)
    const backendRowsQ = useQuery({
      queryKey: ["contractRequestPeople", requestId],
      queryFn: () => ContractRequestAPI.getPeople(requestId!),
      enabled: requestId != null,
      select: (res: any): ContractRequestPersonDto[] =>
        res?.status === "success" ? (res.data as ContractRequestPersonDto[] ?? []) : [],
    });
    const backendRows: ContractRequestPersonDto[] = backendRowsQ.data ?? [];

    // Búsqueda de cargos
    const jobsQ = useQuery<ApiResponse<any>>({
      queryKey: ["jobs", "search", debouncedJobSearch],
      queryFn: () => CargosEspecializadosAPI.searchJobs(debouncedJobSearch),
      enabled: debouncedJobSearch.length >= 2,
    });
    const jobs: any[] = useMemo(() => {
      const raw = jobsQ.data?.status === "success" ? jobsQ.data.data : null;
      if (!raw) return [];
      return Array.isArray(raw) ? raw : raw.items ?? raw.data ?? [];
    }, [jobsQ.data]);

    const selectedJob = useMemo(
      () => jobs.find((j: any) => Number(j.jobID ?? j.jobId ?? j.id) === Number(form.jobId)),
      [jobs, form.jobId]
    );

    const effectiveStart = form.startDate ?? headerStartDate;
    const effectiveEnd   = form.endDate   ?? headerEndDate;
    const monthsPeriod   = calcMonthsPeriod(effectiveStart, effectiveEnd);
    const jobRmu         = selectedJob?.rmu ?? selectedJob?.salary ?? null;
    const rmuCalc        = calcRMU(selectedTypeName, jobRmu, form.weeklyClassHours, form.hourValue);
    const rmuPeriod      = parseFloat((rmuCalc * monthsPeriod).toFixed(2));

    useEffect(() => {
      if (!dialogOpen) {
        setForm({
          requestPersonType: 0,
          jobId: 0,
          startDate: null,
          endDate: null,
          weeklyClassHours: null,
          hourValue: null,
          observation: null,
          createdBy,
          personId: null,
        });
        setJobSearch("");
        setDebouncedJobSearch("");
        setSelectedJobLabel(null);
        setSelectedPersonLabel(null);
        setJobPopoverOpen(false);
      }
    }, [dialogOpen, createdBy]);

    const canSaveRow = useMemo(() => {
      if (!form.requestPersonType || !form.jobId) return false;
      if (selectedTypeName === "DOCENTE") {
        if (!form.weeklyClassHours || form.weeklyClassHours <= 0) return false;
        if (!form.hourValue || form.hourValue <= 0) return false;
      }
      if (form.startDate && form.endDate && form.endDate < form.startDate) return false;
      if (headerStartDate && form.startDate && form.startDate < headerStartDate) return false;
      if (headerEndDate && form.endDate && form.endDate > headerEndDate) return false;
      if (headerStartDate && form.endDate && form.endDate < headerStartDate) return false;
      if (headerEndDate && form.startDate && form.startDate > headerEndDate) return false;
      return true;
    }, [form, selectedTypeName, headerStartDate, headerEndDate]);

    const handleAddRow = () => {
      const jobLabel = selectedJobLabel ?? `Cargo #${form.jobId}`;
      const row: PersonRow = {
        ...form,
        _tempId: `temp-${Date.now()}`,
        _jobLabel: jobLabel,
        _personLabel: selectedPersonLabel ?? undefined,
      };
      setLocalRows((prev) => [...prev, row]);
      setDialogOpen(false);
    };

    const handleRemoveRow = (tempId: string) => {
      setLocalRows((prev) => prev.filter((r) => r._tempId !== tempId));
    };

    const handleBulkConfirm = (bulkRows: BulkValidatedRow[]) => {
      const tipoMap = new Map(
        jobTypes.map((t: any) => [
          (t.name ?? "").toUpperCase(),
          Number(t.id ?? t.typeId ?? t.refTypeId),
        ])
      );
      const newRows: PersonRow[] = bulkRows.map((r) => ({
        _tempId: `bulk-${Date.now()}-${r._rowIndex}`,
        _jobLabel: `Cargo #${r.jobId}`,
        _personLabel: r.personFullName ?? undefined,
        requestPersonType: tipoMap.get(r.tipo.toUpperCase()) ?? 0,
        jobId: r.jobId,
        startDate: r.startDate ?? null,
        endDate: r.endDate ?? null,
        weeklyClassHours: r.weeklyClassHours ?? null,
        hourValue: r.hourValue ?? null,
        observation: r.observation ?? null,
        createdBy,
        personId: r.personId ?? null,
      }));
      setLocalRows((prev) => [...prev, ...newRows]);
    };

    const getTypeName = (typeId: number) => {
      const t = jobTypes.find((x: any) => Number(x.id ?? x.typeId ?? x.refTypeId) === typeId);
      return t?.name ?? `#${typeId}`;
    };

    const getJobLabel = (row: PersonRow) => row._jobLabel ?? `Cargo #${row.jobId}`;

    const isBackendMode = requestId != null;

    // Ocultar sección cuando no hay nada que mostrar en modo lectura
    if (!isBackendMode && localRows.length === 0 && readOnly) return null;
    if (isBackendMode && !backendRowsQ.isLoading && backendRows.length === 0 && readOnly) return null;

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Personas sugeridas
            </CardTitle>
            {!readOnly && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
                  <Upload className="h-3 w-3 mr-1" />
                  Carga masiva
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar persona
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {readOnly
              ? "Personas registradas en esta solicitud."
              : "Opcional. Personas sugeridas desde la solicitud. Se mostrarán primero al generar contratos."}
          </p>
        </CardHeader>

        <CardContent>
          {isBackendMode ? (
            // ── Modo backend: carga desde API ───────────────────────
            backendRowsQ.isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : backendRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin personas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Persona</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Meses</TableHead>
                      <TableHead>RMU</TableHead>
                      <TableHead>RMU Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backendRows.map((row) => (
                      <TableRow key={row.requestPersonId}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {row.statusName ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {row.requestPersonTypeName ?? `#${row.requestPersonType}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{row.personFullName ?? "—"}</TableCell>
                        <TableCell className="text-sm">{row.jobName ?? `#${row.jobId}`}</TableCell>
                        <TableCell className="text-xs">
                          {row.startDate?.slice(0, 10) ?? headerStartDate ?? "—"}{" "}
                          → {row.endDate?.slice(0, 10) ?? headerEndDate ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.monthsPeriod != null ? Number(row.monthsPeriod).toFixed(2) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.rmu != null ? `$${Number(row.rmu).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.rmuPeriod != null ? `$${Number(row.rmuPeriod).toFixed(2)}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            // ── Modo local: filas temporales (formulario de creación) ─
            localRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin personas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Meses</TableHead>
                      <TableHead>RMU</TableHead>
                      <TableHead>RMU Total</TableHead>
                      {!readOnly && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localRows.map((row) => {
                      const es = row.startDate ?? headerStartDate;
                      const ee = row.endDate ?? headerEndDate;
                      const mp = calcMonthsPeriod(es, ee);
                      const rType = (getTypeName(row.requestPersonType)).toUpperCase();
                      const rmuRow = calcRMU(rType, null, row.weeklyClassHours, row.hourValue);
                      return (
                        <TableRow key={row._tempId}>
                          <TableCell className="text-sm">
                            {row._personLabel
                              ? <span className="font-medium">{row._personLabel}</span>
                              : <span className="text-muted-foreground text-xs">Sin asignar</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {getTypeName(row.requestPersonType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{getJobLabel(row)}</TableCell>
                          <TableCell className="text-xs">
                            {row.startDate ?? headerStartDate ?? "—"} → {row.endDate ?? headerEndDate ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm">{mp > 0 ? mp.toFixed(2) : "—"}</TableCell>
                          <TableCell className="text-sm">
                            {rmuRow > 0 ? `$${rmuRow.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {mp > 0 && rmuRow > 0 ? `$${(rmuRow * mp).toFixed(2)}` : "—"}
                          </TableCell>
                          {!readOnly && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveRow(row._tempId)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>

        {/* Diálogo de carga masiva */}
        <BulkPersonUploadDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          onConfirm={handleBulkConfirm}
        />

        {/* Diálogo para agregar persona (solo modo local/crear) */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agregar persona sugerida</DialogTitle>
              <DialogDescription>
                Define el tipo de contratación, cargo y período para esta persona.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Tipo ADMINISTRATIVO / DOCENTE */}
              <div>
                <Label>Tipo de contratación *</Label>
                <Select
                  value={form.requestPersonType ? String(form.requestPersonType) : ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, requestPersonType: Number(v), weeklyClassHours: null, hourValue: null }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={jobTypesQ.isLoading ? "Cargando..." : "Seleccione tipo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTypes.map((t: any) => {
                      const id = t.id ?? t.typeId ?? t.refTypeId;
                      return (
                        <SelectItem key={id} value={String(id)}>
                          {t.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Persona (opcional) */}
              <div>
                <Label>Persona <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <PersonSearchCombobox
                  value={form.personId ?? null}
                  onSelect={(personId, person) => {
                    setForm((f) => ({ ...f, personId }));
                    setSelectedPersonLabel(`${person.firstName} ${person.lastName}`);
                  }}
                />
              </div>

              {/* Búsqueda de cargo — combobox unificado */}
              <div>
                <Label>Cargo *</Label>
                <Popover
                  open={jobPopoverOpen}
                  onOpenChange={(v) => {
                    setJobPopoverOpen(v);
                    if (!v) setJobSearch("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      <span className={cn("truncate text-left flex-1", !selectedJobLabel && !form.jobId && "text-muted-foreground")}>
                        {selectedJobLabel ?? (form.jobId ? `Cargo #${form.jobId}` : "Buscar y seleccionar cargo…")}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" side="bottom">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar cargo (mín. 2 caracteres)…"
                        value={jobSearch}
                        onValueChange={setJobSearch}
                      />
                      <CommandList>
                        {jobsQ.isFetching && (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        {!jobsQ.isFetching && debouncedJobSearch.length < 2 && (
                          <div className="py-5 text-center text-sm text-muted-foreground">
                            Escribe al menos 2 caracteres para buscar.
                          </div>
                        )}
                        {!jobsQ.isFetching && debouncedJobSearch.length >= 2 && jobs.length === 0 && (
                          <CommandEmpty>Sin resultados para "{debouncedJobSearch}".</CommandEmpty>
                        )}
                        {!jobsQ.isFetching && jobs.map((j: any) => {
                          const id = j.jobID ?? j.jobId ?? j.id;
                          const label = j.description ?? j.title ?? j.name ?? `#${id}`;
                          const rmu = j.rmu ?? j.salary;
                          return (
                            <CommandItem
                              key={String(id)}
                              value={String(id)}
                              onSelect={() => {
                                setForm((f) => ({ ...f, jobId: Number(id) }));
                                setSelectedJobLabel(label);
                                setJobPopoverOpen(false);
                                setJobSearch("");
                              }}
                              className="cursor-pointer"
                            >
                              <Check className={cn("mr-2 h-4 w-4 shrink-0", form.jobId === Number(id) ? "opacity-100" : "opacity-0")} />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{label}</p>
                                {rmu != null && (
                                  <p className="text-xs text-muted-foreground">RMU ${Number(rmu).toFixed(2)}</p>
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Fechas del detalle (opcionales — deben estar dentro del período general) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha inicio <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    type="date"
                    value={form.startDate ?? ""}
                    min={headerStartDate ?? undefined}
                    max={form.endDate ?? headerEndDate ?? undefined}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value || null }))}
                  />
                  {headerStartDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Rango: {headerStartDate} → {headerEndDate ?? "sin límite"}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Fecha fin <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    type="date"
                    value={form.endDate ?? ""}
                    min={form.startDate ?? headerStartDate ?? undefined}
                    max={headerEndDate ?? undefined}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || null }))}
                  />
                </div>
              </div>

              {/* Campos DOCENTE */}
              {selectedTypeName === "DOCENTE" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Horas semanales de clase *</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={form.weeklyClassHours ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, weeklyClassHours: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Ej: 4"
                    />
                  </div>
                  <div>
                    <Label>Valor por hora *</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={form.hourValue ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, hourValue: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Ej: 15.50"
                    />
                  </div>
                </div>
              )}

              {/* Resumen de cálculo */}
              {(monthsPeriod > 0 || rmuCalc > 0) && (
                <Card className="bg-muted/40">
                  <CardContent className="pt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Meses</p>
                      <p className="font-semibold">{monthsPeriod > 0 ? monthsPeriod.toFixed(2) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">RMU mensual</p>
                      <p className="font-semibold">{rmuCalc > 0 ? `$${rmuCalc.toFixed(2)}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">RMU total período</p>
                      <p className="font-semibold">{rmuPeriod > 0 ? `$${rmuPeriod.toFixed(2)}` : "—"}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <Label>Observación</Label>
                <Textarea
                  value={form.observation ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value || null }))}
                  placeholder="Observación opcional"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddRow} disabled={!canSaveRow}>
                  Agregar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }
);

export type { PersonRow as ContractRequestPersonRow };
