// src/components/forms/JustificationForm.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { JustificationsAPI, handleApiError } from "@/lib/api";
import { getBossFromEmployeeDetails } from "@/helpers/AuthBoss";

/** ------------- Helpers de fecha/hora (LOCAL, sin convertir a UTC) ------------- **/

// yyyy-MM-dd -> deja igual (date input ya viene local)
const toDateOnlyLocal = (value: string | null) => (value && value.length >= 10 ? value.slice(0, 10) : "");

// yyyy-MM-ddTHH:mm -> devuelve yyyy-MM-ddTHH:mm:ss
const localDateTimeToISOish = (value: string | null) => {
  if (!value) return "";
  // value viene sin zona (ej: 2025-11-10T09:30); conservamos tal cual y agregamos :00
  return value.length === 16 ? `${value}:00` : value;
};

// Diferencia en horas (dos decimales) entre dos datetime-local del mismo día
const diffHoursSameDay = (start: string, end: string) => {
  // Ambos vienen sin zona, los parseamos como local sin ajustes
  const a = new Date(start.replace("T", " ") + ":00");
  const b = new Date(end.replace("T", " ") + ":00");
  if (a.toDateString() !== b.toDateString()) return NaN;
  const ms = b.getTime() - a.getTime();
  return Math.max(0, ms / 36e5); // horas
};

/** ------------- Tipos soportados ------------- **/

type Mode = "PICADA" | "HORAS" | "DIAS";

// function normalizeTypeCode(t: any): Mode | null {
//   // Ajusta aquí según la data real: code/value/name/typeName
//   const raw =
//     (typeof t === "string" ? t : (t?.code || t?.value || t?.name || t?.typeName || t?.description || ""))
//       .toString()
//       .trim()
//       .toUpperCase();

//   if (raw.includes("PICADA") || raw.includes("PUNCH")) return "PICADA";
//   if (raw.includes("HORA")) return "HORAS";
//   if (raw.includes("DIA")) return "DIAS";
//   return null;
// }
// En JustificationForm.tsx - mejora la función normalizeTypeCode
function normalizeTypeCode(t: any): Mode | null {
  const raw = (
    typeof t === "string" 
      ? t 
      : (t?.code || t?.value || t?.name || t?.typeName || t?.description || "")
  )
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD") // Elimina acentos
    .replace(/[\u0300-\u036f]/g, "");

  // Patrones más flexibles para detectar cada modo
  if (raw.includes("PICADA") || raw.includes("PUNCH") || raw.includes("MARCA")) {
    return "PICADA";
  }
  if (raw.includes("HORA") || raw.includes("HOUR")) {
    return "HORAS";
  }
  if (raw.includes("DIA") || raw.includes("DAY") || raw.includes("COMPLETO") || raw.includes("FULL")) {
    return "DIAS";
  }
  
  console.warn("Tipo no reconocido:", raw, t);
  return null;
}

function extractTypeName(typ: any): string {
  return (typ?.name || typ?.typeName || typ?.label || typ?.description || "Tipo").toString();
}

function extractTypeId(typ: any): number {
  return Number(typ?.typeId ?? typ?.id ?? typ?.value ?? typ?.code ?? 0);
}

/** ------------- Props ------------- **/

interface Props {
  types: any[];                 // Tipos de justificación (catálogo)
  onCreated?: () => void;       // callback para refetch y cerrar
  onCancel?: () => void;
}

/** ------------- Componente ------------- **/

export default function JustificationForm({ types, onCreated, onCancel }: Props) {
  const { toast } = useToast();
  const { employeeDetails, user } = useAuth();

  // jefe inmediato desde AuthContext
  const { bossId, bossName } = useMemo(() => getBossFromEmployeeDetails(employeeDetails), [employeeDetails]);

  // formulario controlado
  const [selectedTypeId, setSelectedTypeId] = useState<number>(0);
  const [mode, setMode] = useState<Mode | null>(null);

  const [startDateTime, setStartDateTime] = useState<string>(""); // datetime-local
  const [endDateTime, setEndDateTime] = useState<string>("");     // datetime-local
  const [dateOnly, setDateOnly] = useState<string>("");           // date
  const [startDateOnly, setStartDateOnly] = useState<string>(""); // date
  const [endDateOnly, setEndDateOnly] = useState<string>("");     // date
  const [reason, setReason] = useState<string>("");

  // Derivados
  const selectedType = useMemo(() => types?.find((t) => extractTypeId(t) === selectedTypeId), [types, selectedTypeId]);

  // Nombre arriba del motivo (corrige el "N/A")
  const selectedTypeName = useMemo(() => (selectedType ? extractTypeName(selectedType) : ""), [selectedType]);

  // Modo según tipo
  useEffect(() => {
    if (!selectedType) {
      setMode(null);
      return;
    }
    setMode(normalizeTypeCode(selectedType));
  }, [selectedType]);

  // Al cambiar a PICADA replico hora final = inicial
  useEffect(() => {
    if (mode === "PICADA" && startDateTime) {
      setEndDateTime(startDateTime);
      // y auto seteo fecha (dateOnly) desde start
      setDateOnly(toDateOnlyLocal(startDateTime));
    }
  }, [mode, startDateTime]);

  // Para HORAS fuerzo que ambos sean el mismo día (si no, limpio)
  useEffect(() => {
    if (mode === "HORAS" && startDateTime && endDateTime) {
      const d1 = startDateTime.slice(0, 10);
      const d2 = endDateTime.slice(0, 10);
      if (d1 !== d2) {
        toast({
          title: "Rango inválido",
          description: "Para 'HORAS' inicio y fin deben ser del mismo día.",
          variant: "destructive",
        });
        setEndDateTime("");
      }
      setDateOnly(d1); // fecha justificada
    }
  }, [mode, startDateTime, endDateTime, toast]);

  // Para DIAS auto llena la fecha justificada como el inicio
  useEffect(() => {
    if (mode === "DIAS" && startDateOnly) {
      setDateOnly(startDateOnly);
    }
  }, [mode, startDateOnly]);

  // Horas calculadas (solo para HORAS)
  const hoursCalculated = useMemo(() => {
    if (mode !== "HORAS" || !startDateTime || !endDateTime) return 0;
    const h = diffHoursSameDay(startDateTime, endDateTime);
    return isNaN(h) ? 0 : Number(h.toFixed(2));
  }, [mode, startDateTime, endDateTime]);

  /** Submit **/
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeDetails?.employeeID) {
      toast({ title: "Error", description: "No se encontró su ID de empleado.", variant: "destructive" });
      return;
    }
    if (!bossId) {
      toast({ title: "Error", description: "No se encontró su jefe inmediato en su ficha.", variant: "destructive" });
      return;
    }
    if (!selectedTypeId || !mode) {
      toast({ title: "Error", description: "Seleccione el tipo de justificación.", variant: "destructive" });
      return;
    }

    // Construcción del payload exactamente con los nombres que espera tu backend
    // (según JSON ejemplo que mostraste)
    const nowLocal = new Date();
    const nowStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, "0")}-${String(
      nowLocal.getDate()
    ).padStart(2, "0")}T${String(nowLocal.getHours()).padStart(2, "0")}:${String(nowLocal.getMinutes()).padStart(
      2,
      "0"
    )}:${String(nowLocal.getSeconds()).padStart(2, "0")}`;

    let payload: any = {
      punchJustId: 0,
      employeeId: Number(employeeDetails.employeeID),
      bossEmployeeId: Number(bossId),
      justificationTypeId: Number(selectedTypeId),
      startDate: null as string | null,
      endDate: null as string | null,
      justificationDate: nowStr, // valor por defecto; se ajusta abajo por modo
      reason: reason.trim(),
      hoursRequested: 0,
      approved: false,
      createdAt: nowStr,
      createdBy: Number(employeeDetails.employeeID),
      comments: null,
      status: "PENDING",
    };

    if (mode === "PICADA") {
      if (!startDateTime) {
        toast({ title: "Faltan datos", description: "Indique la fecha y hora de la picada.", variant: "destructive" });
        return;
      }
      const dt = localDateTimeToISOish(startDateTime);
      payload.startDate = dt;
      payload.endDate = dt;
      payload.justificationDate = toDateOnlyLocal(startDateTime) + "T00:00:00";
      payload.hoursRequested = 0;
    }

    if (mode === "HORAS") {
      if (!startDateTime || !endDateTime) {
        toast({ title: "Faltan datos", description: "Indique hora inicial y final.", variant: "destructive" });
        return;
      }
      const d1 = startDateTime.slice(0, 10);
      const d2 = endDateTime.slice(0, 10);
      if (d1 !== d2) {
        toast({
          title: "Rango inválido",
          description: "Para 'HORAS' inicio y fin deben ser del mismo día.",
          variant: "destructive",
        });
        return;
      }
      payload.startDate = localDateTimeToISOish(startDateTime);
      payload.endDate = localDateTimeToISOish(endDateTime);
      payload.justificationDate = d1 + "T00:00:00";
      payload.hoursRequested = hoursCalculated;
    }

    if (mode === "DIAS") {
      if (!startDateOnly) {
        toast({ title: "Faltan datos", description: "Indique fecha de inicio.", variant: "destructive" });
        return;
      }
      const end = endDateOnly || startDateOnly;
      payload.startDate = toDateOnlyLocal(startDateOnly) + "T00:00:00";
      payload.endDate = toDateOnlyLocal(end) + "T23:59:59";
      payload.justificationDate = toDateOnlyLocal(startDateOnly) + "T00:00:00";
      payload.hoursRequested = 0;
    }

    try {
      setSubmitting(true);
      const resp = await JustificationsAPI.create(payload);
      if (resp.status === "error") {
        const msg = handleApiError(resp.error, "No se pudo registrar la justificación.");
        toast({ title: "Error", description: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Justificación registrada", description: "Se envió correctamente." });
      onCreated?.();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo registrar la justificación.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Tipo */}
      <div className="space-y-2">
        <Label>Tipo de justificación *</Label>
        <Select
          value={selectedTypeId ? String(selectedTypeId) : ""}
          onValueChange={(v) => setSelectedTypeId(Number(v))}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione el tipo" />
          </SelectTrigger>
          <SelectContent>
            {types?.map((t) => {
              const id = extractTypeId(t);
              const name = extractTypeName(t);
              return (
                <SelectItem key={`type-${id}`} value={String(id)}>
                  {name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Cabecera: nombre del tipo */}
      {selectedTypeName && (
        <div className="rounded-md border p-3 bg-gray-50">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Tipo seleccionado:</span> {selectedTypeName}
          </p>
          {bossId && (
            <p className="text-xs text-gray-600 mt-1">
              <span className="font-medium">Jefe inmediato:</span> {bossName ? bossName : `ID ${bossId}`}
            </p>
          )}
        </div>
      )}

      {/* Campos dinámicos según modo */}
      {mode === "PICADA" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fecha y hora *</Label>
            <Input
              type="datetime-local"
              max={new Date().toISOString().slice(0, 16)} // solo para UI; no cambia zona
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Hora final (auto)</Label>
            <Input type="text" disabled value={startDateTime ? startDateTime.slice(11, 16) : ""} />
          </div>
        </div>
      )}

      {mode === "HORAS" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora inicial *</Label>
              <Input
                type="datetime-local"
                max={new Date().toISOString().slice(0, 16)}
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Hora final *</Label>
              <Input
                type="datetime-local"
                max={new Date().toISOString().slice(0, 16)}
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fecha (auto)</Label>
              <Input type="text" disabled value={startDateTime ? startDateTime.slice(0, 10) : ""} />
            </div>
            <div className="space-y-2">
              <Label>Horas calculadas</Label>
              <Input type="text" disabled value={hoursCalculated.toFixed(2)} />
            </div>
          </div>
        </>
      )}

      {mode === "DIAS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fecha inicio *</Label>
            <Input type="date" value={startDateOnly} onChange={(e) => setStartDateOnly(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Fecha fin</Label>
            <Input type="date" value={endDateOnly} onChange={(e) => setEndDateOnly(e.target.value)} />
          </div>
        </div>
      )}

      {/* Motivo */}
      <div className="space-y-2">
        <Label>Motivo detallado *</Label>
        <Textarea
          placeholder="Describa el motivo..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          rows={4}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting || !mode}>
          {submitting ? "Enviando..." : "Enviar justificación"}
        </Button>
      </div>
    </form>
  );
}
