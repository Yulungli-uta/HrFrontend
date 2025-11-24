// src/components/forms/JustificationForm.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { JustificationsAPI, HorariosAPI, TiposReferenciaAPI, handleApiError } from "@/lib/api";
import { getBossFromEmployeeDetails } from "@/helpers/AuthBoss";

/** ------------- Helpers de fecha/hora (LOCAL, sin convertir a UTC) ------------- **/

// yyyy-MM-dd -> deja igual (date input ya viene local)
const toDateOnlyLocal = (value: string | null) => (value && value.length >= 10 ? value.slice(0, 10) : "");

// yyyy-MM-ddTHH:mm -> devuelve yyyy-MM-ddTHH:mm:ss
const localDateTimeToISOish = (value: string | null) => {
  if (!value) return "";
  return value.length === 16 ? `${value}:00` : value;
};

// Diferencia en horas (dos decimales) entre dos datetime-local del mismo día
const diffHoursSameDay = (start: string, end: string) => {
  const a = new Date(start.replace("T", " ") + ":00");
  const b = new Date(end.replace("T", " ") + ":00");
  if (a.toDateString() !== b.toDateString()) return NaN;
  const ms = b.getTime() - a.getTime();
  return Math.max(0, ms / 36e5); // horas
};

/** ------------- Tipos soportados ------------- **/

type Mode = "PICADA" | "HORAS" | "DIAS";

function normalizeTypeCode(t: any): Mode | null {
  const raw = (
    typeof t === 'string' 
      ? t 
      : (t?.code || t?.value || t?.name || t?.typeName || t?.description || "")
  )
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

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
  onCreated?: () => void;
  onCancel?: () => void;
}

/** ------------- Componente ------------- **/

export default function JustificationForm({ onCreated, onCancel }: Props) {
  const { toast } = useToast();
  const { employeeDetails, user } = useAuth();
  const { bossId, bossName } = useMemo(() => getBossFromEmployeeDetails(employeeDetails), [employeeDetails]);

  // Estados del formulario
  const [selectedTypeId, setSelectedTypeId] = useState<number>(0);
  const [selectedPunchTypeId, setSelectedPunchTypeId] = useState<number>(0);
  const [mode, setMode] = useState<Mode | null>(null);
  const [startDateTime, setStartDateTime] = useState<string>("");
  const [endDateTime, setEndDateTime] = useState<string>("");
  const [dateOnly, setDateOnly] = useState<string>("");
  const [startDateOnly, setStartDateOnly] = useState<string>("");
  const [endDateOnly, setEndDateOnly] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // Estados para los tipos
  const [justificationTypes, setJustificationTypes] = useState<any[]>([]);
  const [punchTypes, setPunchTypes] = useState<any[]>([]);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(true);

  // Estados para el horario del empleado
  const [employeeSchedule, setEmployeeSchedule] = useState<any>(null);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);
  const [suggestedTime, setSuggestedTime] = useState<string>("");

  // Obtener schedulerID del contexto
  const schedulerID = useMemo(() => {
    return employeeDetails?.schedulerID || employeeDetails?.scheduleID;
  }, [employeeDetails]);

  // Cargar tipos desde la API
  useEffect(() => {
    const loadTypes = async () => {
      try {
        setLoadingTypes(true);
        
        // Cargar tipos de justificación
        const justificationResponse = await TiposReferenciaAPI.byCategory('JUSTIFICATION');
        if (justificationResponse.status === 'success') {
          setJustificationTypes(justificationResponse.data);
        } else {
          toast({
            title: "Error",
            description: "No se pudieron cargar los tipos de justificación.",
            variant: "destructive",
          });
        }

        // Cargar tipos de picada
        const punchResponse = await TiposReferenciaAPI.byCategory('PUNCH_TYPE');
        if (punchResponse.status === 'success') {
          setPunchTypes(punchResponse.data);
        } else {
          toast({
            title: "Error",
            description: "No se pudieron cargar los tipos de picada.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error loading types:', error);
        toast({
          title: "Error",
          description: "Error al cargar los tipos de justificación.",
          variant: "destructive",
        });
      } finally {
        setLoadingTypes(false);
      }
    };

    loadTypes();
  }, [toast]);

  // Derivados
  const selectedType = useMemo(() => 
    justificationTypes?.find((t) => extractTypeId(t) === selectedTypeId), 
    [justificationTypes, selectedTypeId]
  );
  
  const selectedTypeName = useMemo(() => 
    (selectedType ? extractTypeName(selectedType) : ""), 
    [selectedType]
  );

  // Modo según tipo
  useEffect(() => {
    if (!selectedType) {
      setMode(null);
      return;
    }
    setMode(normalizeTypeCode(selectedType));
  }, [selectedType]);

  // Resetear punchTypeId cuando no es modo PICADA
  useEffect(() => {
    if (mode !== "PICADA") {
      setSelectedPunchTypeId(0);
      setSuggestedTime("");
    }
  }, [mode]);

  // Cargar horario del empleado cuando se selecciona fecha en modo PICADA
  useEffect(() => {
    if (mode === "PICADA" && startDateTime && schedulerID) {
      loadEmployeeSchedule();
    } else {
      setEmployeeSchedule(null);
      setSuggestedTime("");
    }
  }, [mode, startDateTime, schedulerID]);

  // Sugerir hora basada en el tipo de picada y el horario del empleado
  useEffect(() => {
    if (mode === "PICADA" && selectedPunchTypeId && employeeSchedule && startDateTime) {
      suggestTimeBasedOnSchedule();
    } else {
      setSuggestedTime("");
    }
  }, [mode, selectedPunchTypeId, employeeSchedule, startDateTime]);

  const loadEmployeeSchedule = async () => {
    if (!schedulerID || !startDateTime) return;
    
    try {
      setLoadingSchedule(true);
      
      // Usar HorariosAPI para obtener el horario por schedulerID
      const response = await HorariosAPI.get(schedulerID);
      
      if (response && response.status === 'success' && response.data) {
        setEmployeeSchedule(response.data);
      } else {
        setEmployeeSchedule(null);
        toast({
          title: "Sin horario",
          description: "No se encontró horario asignado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
      setEmployeeSchedule(null);
      toast({
        title: "Error",
        description: "No se pudo cargar el horario del empleado.",
        variant: "destructive",
      });
    } finally {
      setLoadingSchedule(false);
    }
  };

  const suggestTimeBasedOnSchedule = () => {
    if (!employeeSchedule || !selectedPunchTypeId || !startDateTime) return;

    const selectedPunchType = punchTypes.find(t => extractTypeId(t) === selectedPunchTypeId);
    const punchTypeName = selectedPunchType ? extractTypeName(selectedPunchType).toLowerCase() : "";

    let suggestedTimeValue = "";
    const datePart = startDateTime.slice(0, 10); // yyyy-MM-dd

    // Mapear tipo de picada a campo del horario según la estructura JSON proporcionada
    if (punchTypeName.includes("entrada") && !punchTypeName.includes("almuerzo")) {
      suggestedTimeValue = employeeSchedule.entryTime || "08:00";
    } else if (punchTypeName.includes("salida") && punchTypeName.includes("almuerzo")) {
      suggestedTimeValue = employeeSchedule.lunchStart || "12:00";
    } else if (punchTypeName.includes("regreso") || (punchTypeName.includes("entrada") && punchTypeName.includes("almuerzo"))) {
      suggestedTimeValue = employeeSchedule.lunchEnd || "13:00";
    } else if (punchTypeName.includes("salida") && !punchTypeName.includes("almuerzo")) {
      suggestedTimeValue = employeeSchedule.exitTime || "17:00";
    }

    // Si encontramos una hora sugerida, actualizar el datetime
    if (suggestedTimeValue) {
      // Asegurarnos de que la hora tenga formato HH:mm (remover segundos si existen)
      const formattedTime = suggestedTimeValue.includes(':') 
        ? suggestedTimeValue.slice(0, 5)  // Tomar solo HH:mm
        : "08:00";
      
      const newDateTime = `${datePart}T${formattedTime}`;
      setStartDateTime(newDateTime);
      setEndDateTime(newDateTime);
      setSuggestedTime(formattedTime);
    }
  };

  // Al cambiar a PICADA replico hora final = inicial
  useEffect(() => {
    if (mode === "PICADA" && startDateTime) {
      setEndDateTime(startDateTime);
      setDateOnly(toDateOnlyLocal(startDateTime));
    }
  }, [mode, startDateTime]);

  // Para HORAS fuerzo que ambos sean el mismo día
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
      setDateOnly(d1);
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
    
    if (loadingTypes) {
      toast({ title: "Error", description: "Los tipos aún se están cargando.", variant: "destructive" });
      return;
    }
    
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

    // Validación específica para PICADA
    if (mode === "PICADA" && !selectedPunchTypeId) {
      toast({ title: "Error", description: "Para justificación de picada, debe seleccionar el tipo de picada.", variant: "destructive" });
      return;
    }

    // Construcción del payload
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
      punchTypeId: null as number | null,
      startDate: null as string | null,
      endDate: null as string | null,
      justificationDate: nowStr,
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
      payload.punchTypeId = selectedPunchTypeId;
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

  if (loadingTypes) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando tipos de justificación...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Tipo de justificación */}
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
            {justificationTypes?.map((t) => {
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

      {/* Campo para tipo de picada (solo visible en modo PICADA) */}
      {mode === "PICADA" && (
        <div className="space-y-2">
          <Label>Tipo de picada *</Label>
          <Select
            value={selectedPunchTypeId ? String(selectedPunchTypeId) : ""}
            onValueChange={(v) => setSelectedPunchTypeId(Number(v))}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione el tipo de picada" />
            </SelectTrigger>
            <SelectContent>
              {punchTypes?.map((t) => {
                const id = extractTypeId(t);
                const name = extractTypeName(t);
                return (
                  <SelectItem key={`punch-type-${id}`} value={String(id)}>
                    {name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={startDateTime ? startDateTime.slice(0, 10) : ""}
                onChange={(e) => {
                  const date = e.target.value;
                  const time = startDateTime ? startDateTime.slice(11, 16) : "00:00";
                  setStartDateTime(date && time ? `${date}T${time}` : date);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Hora *</Label>
              <Input
                type="time"
                value={startDateTime ? startDateTime.slice(11, 16) : ""}
                onChange={(e) => {
                  const time = e.target.value;
                  const date = startDateTime ? startDateTime.slice(0, 10) : "";
                  setStartDateTime(date && time ? `${date}T${time}` : "");
                }}
                required
              />
            </div>
          </div>

          {/* Información del horario */}
          {loadingSchedule && (
            <div className="text-sm text-blue-600">Cargando horario del empleado...</div>
          )}

          {employeeSchedule && suggestedTime && (
            <div className="rounded-md border p-3 bg-blue-50">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Horario asignado:</span> 
                {employeeSchedule.entryTime && ` Entrada: ${employeeSchedule.entryTime}`}
                {employeeSchedule.lunchStart && ` | Almuerzo salida: ${employeeSchedule.lunchStart}`}
                {employeeSchedule.lunchEnd && ` | Almuerzo regreso: ${employeeSchedule.lunchEnd}`}
                {employeeSchedule.exitTime && ` | Salida: ${employeeSchedule.exitTime}`}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <span className="font-medium">Hora sugerida:</span> {suggestedTime}
              </p>
            </div>
          )}

          {!schedulerID && (
            <div className="rounded-md border p-3 bg-yellow-50">
              <p className="text-sm text-yellow-700">
                No se encontró schedulerID en su perfil. No se puede cargar el horario automáticamente.
              </p>
            </div>
          )}

          {employeeSchedule === null && startDateTime && schedulerID && (
            <div className="rounded-md border p-3 bg-yellow-50">
              <p className="text-sm text-yellow-700">
                No se encontró horario asignado. Por favor, ingrese la hora manualmente.
              </p>
            </div>
          )}
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting || loadingTypes}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting || loadingTypes || !mode || (mode === "PICADA" && !selectedPunchTypeId)}>
          {submitting ? "Enviando..." : "Enviar justificación"}
        </Button>
      </div>
    </form>
  );
}