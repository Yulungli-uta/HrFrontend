import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Upload } from "lucide-react";

import { EmployeeCombobox } from "@/components/ui/EmployeeCombobox";
import { TimeBalanceAPI, TiposReferenciaAPI, EmployeeLaborRegimesAPI } from "@/lib/api";
import type {
  VacationBalanceAdjustmentMode,
  VacationBalanceBulkAdjustmentItem,
  VacationBalanceBulkAdjustmentRowResult,
} from "@/lib/api/services/attendance";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";

function minutesToDaysHoursMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(totalMinutes);
  const d = Math.floor(abs / MINUTES_PER_DAY);
  const h = Math.floor((abs % MINUTES_PER_DAY) / 60);
  const m = abs % 60;
  return `${sign}${d}d ${h}h ${m}min (${totalMinutes} min totales)`;
}

/**
 * Conversión días/horas/minutos <-> minutos totales para la UI, usando el mismo
 * WORK_MINUTES_PER_DAY (480 = 8h) que el backend lee de hr.TBL_PARAMETERS. Es solo
 * una conveniencia de entrada — el backend no depende de esta conversión.
 */
const MINUTES_PER_DAY = 480;

function toMinutes(days: number, hours: number, minutes: number): number {
  return (days || 0) * MINUTES_PER_DAY + (hours || 0) * 60 + (minutes || 0);
}

// ─────────────────────────────────────────────────────────────────────────
// Pestaña 1: Ajuste individual
// ─────────────────────────────────────────────────────────────────────────

const individualSchema = z.object({
  employeeId: z.number({ required_error: "Seleccione un empleado" }).int().positive(),
  laborRegimeName: z.string().min(1, "Seleccione un régimen"),
  balanceField: z.enum(["Vacation", "Recovery"]).default("Vacation"),
  mode: z.enum(["Increment", "Set"]),
  days: z.number().default(0),
  hours: z.number().default(0),
  minutes: z.number().default(0),
  reason: z.string().min(5, "El motivo es obligatorio (mínimo 5 caracteres)"),
  allowNegativeResult: z.boolean().default(false),
});

type IndividualFormData = z.infer<typeof individualSchema>;

function IndividualAdjustmentTab() {
  const { toast } = useToast();

  const form = useForm<IndividualFormData>({
    resolver: zodResolver(individualSchema) as any,
    defaultValues: {
      employeeId: undefined as unknown as number,
      laborRegimeName: "",
      balanceField: "Vacation",
      mode: "Increment",
      days: 0,
      hours: 0,
      minutes: 0,
      reason: "",
      allowNegativeResult: false,
    },
  });

  const mode = form.watch("mode");
  const employeeId = form.watch("employeeId");
  const laborRegimeName = form.watch("laborRegimeName");
  const days = form.watch("days");
  const hours = form.watch("hours");
  const minutes = form.watch("minutes");

  // Regímenes que el empleado REALMENTE tiene activos — nunca se ofrece la lista completa
  // del catálogo, para no poder ajustar un régimen al que la persona no pertenece.
  const { data: employeeRegimesResp, isFetching: loadingRegimes } = useQuery({
    queryKey: ["employee-labor-regimes", employeeId],
    queryFn: () => EmployeeLaborRegimesAPI.byEmployee(employeeId),
    enabled: !!employeeId,
  });
  const activeRegimes = employeeRegimesResp?.status === "success"
    ? (employeeRegimesResp.data ?? []).filter((r) => r.isActive)
    : [];

  // Al cambiar de empleado: limpiar régimen elegido y auto-seleccionar si solo tiene uno activo.
  useEffect(() => {
    form.setValue("laborRegimeName", "");
  }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeRegimes.length === 1 && activeRegimes[0].laborRegimeName) {
      form.setValue("laborRegimeName", activeRegimes[0].laborRegimeName);
    }
  }, [employeeRegimesResp]); // eslint-disable-line react-hooks/exhaustive-deps

  const qc = useQueryClient();

  // Saldo actual (ambas bolsas) del empleado+régimen seleccionado — se precarga en pantalla,
  // positivo o negativo, antes de aplicar cualquier ajuste. staleTime:0 + invalidate en
  // onSuccess del ajuste para que SIEMPRE se vuelva a consultar al servidor después de
  // guardar (nunca mostrar un valor cacheado que ya quedó desactualizado).
  const { data: currentBalanceResp, isFetching: loadingBalance } = useQuery({
    queryKey: ["current-time-balance", employeeId, laborRegimeName],
    queryFn: () => TimeBalanceAPI.getCurrentBalance(employeeId, laborRegimeName),
    enabled: !!employeeId && !!laborRegimeName,
    staleTime: 0,
  });
  const currentBalance = currentBalanceResp?.status === "success" ? currentBalanceResp.data : undefined;

  const previewMinutes = toMinutes(days, hours, minutes);

  const mutation = useMutation({
    mutationFn: (data: IndividualFormData) =>
      TimeBalanceAPI.adjust({
        employeeId: data.employeeId,
        laborRegimeName: data.laborRegimeName,
        balanceField: data.balanceField,
        mode: data.mode as VacationBalanceAdjustmentMode,
        valueMinutes: toMinutes(data.days, data.hours, data.minutes),
        reason: data.reason,
        allowNegativeResult: data.allowNegativeResult,
      }),
    onSuccess: async (res, variables) => {
      if (res.status === "success" && res.data) {
        toast({
          title: "Saldo ajustado",
          description: `Saldo anterior: ${res.data.previousBalanceMin} min → Nuevo: ${res.data.newBalanceMin} min (delta ${res.data.deltaAppliedMin >= 0 ? "+" : ""}${res.data.deltaAppliedMin} min).`,
        });

        // Fuerza a re-consultar el saldo real al servidor (nunca dejar el valor viejo en
        // pantalla) — la persona que ajusta va a querer verificar de inmediato que quedó bien.
        await qc.invalidateQueries({ queryKey: ["current-time-balance", variables.employeeId, variables.laborRegimeName] });

        // Mantiene empleado/régimen/bolsa seleccionados (para ver el saldo recién actualizado
        // sin tener que volver a buscar a la persona); solo limpia los campos del ajuste en sí.
        form.reset({
          employeeId: variables.employeeId,
          laborRegimeName: variables.laborRegimeName,
          balanceField: variables.balanceField,
          mode: "Increment",
          days: 0,
          hours: 0,
          minutes: 0,
          reason: "",
          allowNegativeResult: false,
        });
      } else {
        toast({ title: "Error al ajustar", description: parseApiError(res).message, variant: "destructive" });
      }
    },
    onError: (err) => {
      toast({ title: "Error al ajustar", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <FormField
          control={form.control as any}
          name="employeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Empleado</FormLabel>
              <FormControl>
                <EmployeeCombobox value={field.value ?? null} onSelect={(id) => field.onChange(id ?? undefined)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="laborRegimeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Régimen laboral (solo los que el empleado realmente tiene activos)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={!employeeId || loadingRegimes}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={!employeeId ? "Primero seleccione un empleado" : loadingRegimes ? "Cargando..." : "Seleccionar régimen"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeRegimes.map((r) => (
                    <SelectItem key={r.laborRegimeId} value={r.laborRegimeName ?? ""}>
                      {r.laborRegimeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {employeeId && !loadingRegimes && activeRegimes.length === 0 && (
                <p className="text-xs text-destructive mt-1">Este empleado no tiene ningún régimen laboral activo — no se puede ajustar su saldo.</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {employeeId && laborRegimeName && (
          <div className="rounded-lg border p-4 bg-muted/30">
            <p className="text-sm font-medium mb-2">Saldo actual ({laborRegimeName})</p>
            {loadingBalance ? (
              <p className="text-sm text-muted-foreground">Cargando saldo...</p>
            ) : currentBalance ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Vacaciones</p>
                  <p className={`text-lg font-semibold ${currentBalance.vacationAvailableMin < 0 ? "text-destructive" : ""}`}>
                    {minutesToDaysHoursMinutes(currentBalance.vacationAvailableMin)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recuperación de horas (incluye pandemia)</p>
                  <p className={`text-lg font-semibold ${currentBalance.recoveryPendingMin < 0 ? "text-destructive" : ""}`}>
                    {minutesToDaysHoursMinutes(currentBalance.recoveryPendingMin)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos.</p>
            )}
          </div>
        )}

        <FormField
          control={form.control as any}
          name="balanceField"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bolsa a ajustar</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Vacation">Vacaciones</SelectItem>
                  <SelectItem value="Recovery">Recuperación de horas (incluye pandemia)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de ajuste</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Increment">Incrementar / Descontar (delta sobre el saldo actual)</SelectItem>
                  <SelectItem value="Set">Establecer (reemplaza el saldo actual por este valor)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Label className="mb-2 block">
            {mode === "Set" ? "Valor final del saldo" : "Cantidad a incrementar (+) o descontar (-)"}
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control as any}
              name="days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground font-normal">Días</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground font-normal">Horas</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground font-normal">Minutos</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            No hay campo de segundos — el sistema solo maneja días/horas/minutos. Total: <b>{previewMinutes} minutos</b>
            {" "}({minutesToDaysHoursMinutes(previewMinutes)}). Valores negativos permitidos (ej. para "Establecer" un saldo real negativo, o para "Descontar" en modo Incrementar).
          </p>
        </div>

        <FormField
          control={form.control as any}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo (obligatorio)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Ej. corrección de saldo por error histórico, verificado con RRHH." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="allowNegativeResult"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Permitir que el saldo resultante quede negativo</FormLabel>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Aplicando...
            </>
          ) : (
            "Aplicar ajuste"
          )}
        </Button>
      </form>
    </Form>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Pestaña 2: Carga masiva desde Excel
// ─────────────────────────────────────────────────────────────────────────

interface ParsedRow {
  cedula: string;
  nombre: string;
  valueMinutes: number;
}

/**
 * Layout esperado (hoja "CODIGO DE TRABAJO" del listado de RRHH): encabezado en
 * filas 6-7 (combinadas), datos desde la fila 8. Columnas 0-indexed: B=nombre(1),
 * C=cédula(2), L=días(11), M=horas(12), N=minutos(13), O=saldo recuperación
 * horas por pandemia(14, valor único sin desglose D/H/M — se toma como minutos
 * directos). Si el archivo cambia de formato, ajustar estos índices.
 */
function parseWorkbook(buffer: ArrayBuffer, field: "Vacation" | "Recovery"): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames.includes("CODIGO DE TRABAJO") ? "CODIGO DE TRABAJO" : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  const parsed: ParsedRow[] = [];
  for (let i = 7; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const cedula = row[2];
    if (!cedula) continue;

    const nombre = row[1] ?? "";

    if (field === "Recovery") {
      // Solo las filas que realmente tienen valor en la columna de pandemia (14 de 242).
      if (row[14] === undefined || row[14] === null || row[14] === "") continue;
      parsed.push({
        cedula: String(cedula).trim(),
        nombre: String(nombre).trim(),
        valueMinutes: Number(row[14]),
      });
      continue;
    }

    const dias = Number(row[11] ?? 0);
    const horas = Number(row[12] ?? 0);
    const minutos = Number(row[13] ?? 0);

    parsed.push({
      cedula: String(cedula).trim(),
      nombre: String(nombre).trim(),
      valueMinutes: toMinutes(dias, horas, minutos),
    });
  }
  return parsed;
}

function BulkAdjustmentTab() {
  const { toast } = useToast();
  const [balanceField, setBalanceField] = useState<"Vacation" | "Recovery">("Vacation");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [batchTag, setBatchTag] = useState("CT_2026");
  const [reason, setReason] = useState("Carga inicial de saldo de vacaciones — Código de Trabajo 2026 (listado RRHH).");
  const [laborRegimeName, setLaborRegimeName] = useState("Código Trabajo");
  const [allowNegativeResult, setAllowNegativeResult] = useState(true);
  const [results, setResults] = useState<VacationBalanceBulkAdjustmentRowResult[] | null>(null);

  const { data: regimesResp } = useQuery({
    queryKey: ["refTypes", REF_TYPE_CATEGORIES.CONTRACT_TYPE],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.CONTRACT_TYPE),
  });
  const regimes = regimesResp?.status === "success" ? (regimesResp.data ?? []).filter((r: any) => r.isActive) : [];

  const negativeCount = useMemo(() => parsedRows.filter((r) => r.valueMinutes < 0).length, [parsedRows]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResults(null);
    const buffer = await file.arrayBuffer();
    const rows = parseWorkbook(buffer, balanceField);
    setParsedRows(rows);
  };

  const mutation = useMutation({
    mutationFn: () => {
      const items: VacationBalanceBulkAdjustmentItem[] = parsedRows.map((r) => ({
        cedula: r.cedula,
        laborRegimeName,
        balanceField,
        mode: "Set",
        valueMinutes: r.valueMinutes,
        reason,
        allowNegativeResult,
      }));
      return TimeBalanceAPI.bulkAdjust(batchTag, items);
    },
    onSuccess: (res) => {
      if (res.status === "success" && res.data) {
        setResults(res.data);
        const okCount = res.data.filter((r) => r.success).length;
        toast({
          title: "Carga masiva completada",
          description: `${okCount} de ${res.data.length} filas cargadas correctamente.`,
        });
      } else {
        toast({ title: "Error en la carga", description: parseApiError(res).message, variant: "destructive" });
      }
    },
    onError: (err) => {
      toast({ title: "Error en la carga", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-1 block">Bolsa a cargar</Label>
        <Select
          value={balanceField}
          onValueChange={(v) => {
            setBalanceField(v as "Vacation" | "Recovery");
            setParsedRows([]);
            setFileName(null);
            setResults(null);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Vacation">Vacaciones (columnas Días/Horas/Min)</SelectItem>
            <SelectItem value="Recovery">Recuperación de horas por pandemia (columna única)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block">Archivo Excel</Label>
        <Input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {fileName && <p className="text-sm text-muted-foreground mt-1">{fileName} — {parsedRows.length} filas detectadas.</p>}
      </div>

      {parsedRows.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Régimen laboral (aplica a todas las filas)</Label>
              <Select value={laborRegimeName} onValueChange={setLaborRegimeName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regimes.map((r: any) => (
                    <SelectItem key={r.typeID ?? r.typeId ?? r.id} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Etiqueta del lote (BatchTag)</Label>
              <Input value={batchTag} onChange={(e) => setBatchTag(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Motivo (aplica a todas las filas)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={allowNegativeResult} onCheckedChange={(v) => setAllowNegativeResult(Boolean(v))} />
            <Label>Permitir saldos negativos (refleja deuda real ya validada por RRHH)</Label>
          </div>

          {negativeCount > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                {negativeCount} de {parsedRows.length} filas tienen saldo negativo en el archivo. Si "Permitir saldos negativos" está desmarcado, esas filas serán rechazadas.
              </span>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Saldo (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((r) => (
                  <TableRow key={r.cedula}>
                    <TableCell>{r.cedula}</TableCell>
                    <TableCell>{r.nombre}</TableCell>
                    <TableCell className={`text-right ${r.valueMinutes < 0 ? "text-destructive font-medium" : ""}`}>
                      {r.valueMinutes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Cargando {parsedRows.length} filas...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Cargar {parsedRows.length} filas
              </>
            )}
          </Button>
        </>
      )}

      {results && (
        <div className="space-y-2">
          <h3 className="font-semibold">
            Resultado: {results.filter((r) => r.success).length} de {results.length} cargadas correctamente
          </h3>
          <div className="max-h-96 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead className="text-right">Anterior → Nuevo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.cedula}>
                    <TableCell>{r.cedula}</TableCell>
                    <TableCell>
                      <Badge variant={r.success ? "default" : "destructive"}>{r.success ? "OK" : "Error"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.message}</TableCell>
                    <TableCell className="text-right text-sm">
                      {r.previousBalanceMin != null && r.newBalanceMin != null
                        ? `${r.previousBalanceMin} → ${r.newBalanceMin}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────
// Nota: la pestaña de "Liquidaciones Pendientes" se movió a su propia página
// (pages/Liquidaciones.tsx) — la liquidación puede originarse por renuncia,
// jubilación, fin de contrato o acción de personal, no solo por un ajuste de saldo.

export default function VacationBalanceAdjustmentPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ajuste de Saldo de Vacaciones</h1>
        <p className="text-muted-foreground">
          Acción de Recursos Humanos. No sustituye la acreditación automática mensual — solo mueve el saldo actual, con motivo y trazabilidad obligatorios.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajustar saldo</CardTitle>
          <CardDescription>Carga individual puntual o carga masiva desde el listado de Excel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="individual">
            <TabsList>
              <TabsTrigger value="individual">Ajuste individual</TabsTrigger>
              <TabsTrigger value="bulk">Carga masiva (Excel)</TabsTrigger>
            </TabsList>
            <TabsContent value="individual" className="pt-4">
              <IndividualAdjustmentTab />
            </TabsContent>
            <TabsContent value="bulk" className="pt-4">
              <BulkAdjustmentTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
