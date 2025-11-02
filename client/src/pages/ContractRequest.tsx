// src/pages/ContractRequest.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, Plus, Search, Clock, Calendar, User, Building, Eye, CheckCircle, Download,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { ContractRequestAPI, type ApiResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/** ===== Tipos ===== */
interface ContractRequest {
  requestId: number;
  workModalityId: number;
  numberTeacher: number;
  numberHour: number;
  status: number;
  contractCode?: string;
  contractNumber?: string;
  applicantName?: string;
  department?: string;
  position?: string;
  contractType?: string;
  startDate?: string;
  endDate?: string;
  salary?: number;
  filename?: string;
  filepath?: string;
  createdAt?: string;
  createdBy?: number;
}

interface UIContractRequest extends ContractRequest {
  isActive: boolean;
  daysRemaining?: number;
  statusText: string;
  statusVariant: "default" | "secondary" | "destructive" | "outline";
}

/** ===================== Página ===================== */
export default function ContractRequestPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, employeeDetails } = useAuth();

  const ctxCreatedBy = Number.isFinite(Number(employeeDetails?.employeeID))
    ? Number(employeeDetails?.employeeID)
    : (Number.isFinite(Number(user?.id)) ? Number(user?.id) : 0);

  // Diálogos / estado general
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<UIContractRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ----------------- Estado del formulario de creación -----------------
  const [form, setForm] = useState<Partial<ContractRequest>>({
    workModalityId: 0,
    numberTeacher: 0,
    numberHour: 0,
    status: 2, // Pendiente
    contractCode: "",
    contractNumber: "",
    applicantName: "",
    department: "",
    position: "",
    contractType: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    salary: 0,
    createdAt: new Date().toISOString(),
    createdBy: ctxCreatedBy,
  });

  // ----------------- Query de listado -----------------
  const { data: apiResponse, isLoading, error } = useQuery<ApiResponse<ContractRequest[]>>({
    queryKey: ['/api/v1/rh/cv/contract-request'],
    queryFn: () => ContractRequestAPI.list(),
  });

  // ----------------- Mutación de creación -----------------
  const createMutation = useMutation({
    mutationFn: (payload: ContractRequest) => ContractRequestAPI.create(payload as any),
    onSuccess: (resp) => {
      console.log("✅ Respuesta del servidor:", resp);
      
      if (resp.status === "success") {
        toast({ 
          title: "✅ Solicitud de contrato creada", 
          description: "Se guardó correctamente en el sistema." 
        });
        qc.invalidateQueries({ 
          queryKey: ['/api/v1/rh/cv/contract-request'] 
        });
        setIsFormOpen(false);
        resetForm();
      } else {
        console.error("❌ Error del servidor:", resp.error);
        toast({
          title: "❌ Error al guardar",
          description: resp.error?.message ?? "No se pudo guardar la solicitud de contrato",
          variant: "destructive"
        });
      }
    },
    onError: (e: any) => {
      console.error("❌ Error de red:", e);
      toast({ 
        title: "❌ Error de conexión", 
        description: e?.message ?? "No se pudo conectar con el servidor", 
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setForm({
      workModalityId: 0,
      numberTeacher: 0,
      numberHour: 0,
      status: 2,
      contractCode: "",
      contractNumber: "",
      applicantName: "",
      department: "",
      position: "",
      contractType: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      salary: 0,
      createdAt: new Date().toISOString(),
      createdBy: ctxCreatedBy,
    });
  };

  // ----------------- Helpers de UI -----------------
  const getStatusInfo = (status: number): { text: string; variant: UIContractRequest["statusVariant"] } => {
    switch (status) {
      case 1: return { text: "Activo", variant: "default" };
      case 2: return { text: "Pendiente", variant: "secondary" };
      case 3: return { text: "Aprobado", variant: "default" };
      case 4: return { text: "Rechazado", variant: "destructive" };
      case 0: return { text: "Inactivo", variant: "outline" };
      default: return { text: "Desconocido", variant: "outline" };
    }
  };

  const getDaysRemaining = (endDate: string): number => {
    const expiryDate = new Date(endDate);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const contracts: UIContractRequest[] = useMemo(() => {
    if (apiResponse?.status !== "success") return [];
    return apiResponse.data.map((contract) => {
      const statusInfo = getStatusInfo(contract.status);
      const daysRemaining = contract.endDate ? getDaysRemaining(contract.endDate) : undefined;
      return {
        ...contract,
        isActive: contract.status === 1 || contract.status === 3,
        daysRemaining: daysRemaining && daysRemaining > 0 ? daysRemaining : undefined,
        statusText: statusInfo.text,
        statusVariant: statusInfo.variant,
      };
    });
  }, [apiResponse]);

  const filteredContracts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return contracts.filter((c) =>
      (c.contractCode?.toLowerCase() || '').includes(q) ||
      (c.contractNumber?.toLowerCase() || '').includes(q) ||
      (c.applicantName?.toLowerCase() || '').includes(q) ||
      (c.department?.toLowerCase() || '').includes(q) ||
      (c.position?.toLowerCase() || '').includes(q) ||
      (c.contractType?.toLowerCase() || '').includes(q) ||
      c.statusText.toLowerCase().includes(q)
    );
  }, [searchTerm, contracts]);

  // Stats
  const totalContracts = contracts.length;
  const approvedContracts = contracts.filter(c => c.status === 3).length;
  const pendingContracts = contracts.filter(c => c.status === 2).length;
  const activeContracts = contracts.filter(c => c.status === 1).length;
  const expiringSoon = contracts.filter(c => c.daysRemaining && c.daysRemaining < 30).length;

  // Ver detalles
  const handleViewDetails = (c: UIContractRequest) => {
    setSelectedContract(c);
    setIsDetailOpen(true);
  };

  // ----------------- Loading / Error de lista -----------------
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center space-x-2 mb-4 md:mb-6">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3 md:space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex space-x-3 md:space-x-4 animate-pulse">
              <div className="h-12 flex-1 bg-gray-200 rounded" />
              <div className="h-12 flex-1 bg-gray-200 rounded" />
              <div className="h-12 flex-1 bg-gray-200 rounded" />
              <div className="h-12 w-20 md:w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || apiResponse?.status === "error") {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">
              Error al cargar las solicitudes de contrato. {apiResponse?.status === "error" ? apiResponse.error.message : "Intente nuevamente."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----------------- Render -----------------
  return (
    <div className="container mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            Gestión de Solicitudes de Contrato
          </h1>
          <p className="text-gray-600 mt-1 lg:mt-2 text-sm lg:text-base">
            Administre las solicitudes de contrato del sistema
          </p>
        </div>

        {/* Botón abrir formulario */}
        <Dialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 w-full lg:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Solicitud
            </Button>
          </DialogTrigger>

          {/* ------------------- FORMULARIO ------------------- */}
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Solicitud de Contrato</DialogTitle>
              <DialogDescription>
                Complete la información de la solicitud de contrato.
              </DialogDescription>
            </DialogHeader>

            {/* Campos principales del JSON */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="workModalityId">ID Modalidad de Trabajo *</Label>
                <Input
                  id="workModalityId"
                  type="number"
                  value={form.workModalityId ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, workModalityId: Number(e.target.value) }))}
                  placeholder="Ej: 1"
                />
              </div>
              <div>
                <Label htmlFor="numberTeacher">Número de Docente</Label>
                <Input
                  id="numberTeacher"
                  type="number"
                  value={form.numberTeacher ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, numberTeacher: Number(e.target.value) }))}
                  placeholder="Ej: 5"
                />
              </div>
              <div>
                <Label htmlFor="numberHour">Número de Horas</Label>
                <Input
                  id="numberHour"
                  type="number"
                  value={form.numberHour ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, numberHour: Number(e.target.value) }))}
                  placeholder="Ej: 40"
                />
              </div>
              <div>
                <Label htmlFor="status">Estado</Label>
                <Input
                  id="status"
                  type="number"
                  value={form.status ?? 2}
                  onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}
                  placeholder="0=Inactivo, 1=Activo, 2=Pendiente, 3=Aprobado, 4=Rechazado"
                />
              </div>
            </div>

            {/* Campos adicionales (opcionales) */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Información Adicional del Contrato</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractCode">Código de Contrato</Label>
                  <Input
                    id="contractCode"
                    value={form.contractCode ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, contractCode: e.target.value }))}
                    placeholder="Ej: CONT-2025-001"
                  />
                </div>
                <div>
                  <Label htmlFor="contractNumber">Número de Contrato</Label>
                  <Input
                    id="contractNumber"
                    value={form.contractNumber ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, contractNumber: e.target.value }))}
                    placeholder="Ej: CT-001"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="applicantName">Nombre del Solicitante</Label>
                  <Input
                    id="applicantName"
                    value={form.applicantName ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={form.department ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    placeholder="Ej: Recursos Humanos"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={form.position ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                    placeholder="Ej: Analista de RH"
                  />
                </div>
                <div>
                  <Label htmlFor="contractType">Tipo de Contrato</Label>
                  <Input
                    id="contractType"
                    value={form.contractType ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, contractType: e.target.value }))}
                    placeholder="Ej: Tiempo Completo"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Fecha de Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Fecha de Fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="salary">Salario</Label>
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    value={form.salary ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, salary: Number(e.target.value) }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="createdBy">Creado por (ID usuario)</Label>
                  <Input id="createdBy" type="number" value={ctxCreatedBy} disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Se toma del usuario en sesión {employeeDetails?.fullName ? `(${employeeDetails.fullName})` : ""}.
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6 justify-end">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  // Validaciones de campos requeridos según el JSON
                  if (form.workModalityId === undefined || form.workModalityId === null) {
                    toast({ 
                      title: "❌ Campo requerido", 
                      description: "El ID de modalidad de trabajo es obligatorio", 
                      variant: "destructive" 
                    });
                    return;
                  }

                  // Prepara el payload con los campos del JSON
                  const payload: ContractRequest = {
                    workModalityId: form.workModalityId ?? 0,
                    numberTeacher: form.numberTeacher ?? 0,
                    numberHour: form.numberHour ?? 0,
                    status: form.status ?? 2,
                    // Campos adicionales opcionales
                    contractCode: form.contractCode,
                    contractNumber: form.contractNumber,
                    applicantName: form.applicantName,
                    department: form.department,
                    position: form.position,
                    contractType: form.contractType,
                    startDate: form.startDate,
                    endDate: form.endDate,
                    salary: form.salary,
                    createdAt: new Date().toISOString(),
                    createdBy: ctxCreatedBy,
                    requestId: 0, // Se genera automáticamente en el backend
                  };

                  console.log("📤 Enviando payload:", payload);
                  
                  createMutation.mutate(payload);
                }}
                disabled={createMutation.isPending}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? "🔄 Guardando..." : "💾 Guardar Solicitud"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats (grid responsivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600 mr-2" />
                Total
              </span>
              <Badge variant="secondary" className="bg-blue-200 text-blue-800 text-xs lg:text-sm">
                {totalContracts}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">Solicitudes registradas</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-600 mr-2" />
                Aprobadas
              </span>
              <Badge variant="secondary" className="bg-green-200 text-green-800 text-xs lg:text-sm">
                {approvedContracts}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">
              {totalContracts > 0 ? ((approvedContracts / totalContracts) * 100).toFixed(1) : 0}% del total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600 mr-2" />
                Pendientes
              </span>
              <Badge variant="secondary" className="bg-orange-200 text-orange-800 text-xs lg:text-sm">
                {pendingContracts}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">
              {totalContracts > 0 ? ((pendingContracts / totalContracts) * 100).toFixed(1) : 0}% del total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <User className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600 mr-2" />
                Activos
              </span>
              <Badge variant="secondary" className="bg-purple-200 text-purple-800 text-xs lg:text-sm">
                {activeContracts}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">Contratos vigentes</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-red-600 mr-2" />
                Por Vencer
              </span>
              <Badge variant="secondary" className="bg-red-200 text-red-800 text-xs lg:text-sm">
                {expiringSoon}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">En los próximos 30 días</div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar solicitud por código, número, solicitante, departamento o estado..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Cards (móvil) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredContracts.map((c) => (
          <Card key={c.requestId} className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="truncate">{c.contractCode || `Contrato #${c.requestId}`}</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <span className="font-medium">Modalidad:</span> {c.workModalityId} ·{" "}
                    <span className="font-medium">Horas:</span> {c.numberHour}
                  </CardDescription>
                </div>
                <Badge
                  variant={c.statusVariant}
                  className={
                    c.status === 1 || c.status === 3
                      ? "bg-green-100 text-green-800"
                      : c.status === 2
                      ? "bg-orange-100 text-orange-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {c.statusText}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {c.applicantName || "No especificado"}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Building className="h-4 w-4" />
                    {c.department || "No especificado"}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {c.startDate ? new Date(c.startDate).toLocaleDateString() : "No definida"}
                  </div>
                  {c.daysRemaining && c.daysRemaining < 30 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs mt-1">
                      {c.daysRemaining}d
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(c)}
                  className="h-8"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredContracts.length === 0 && (
          <Card className="text-center py-10">
            <CardContent>
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                {searchTerm ? "No se encontraron solicitudes" : "No hay solicitudes de contrato registradas"}
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                {searchTerm ? "Intente con otros términos de búsqueda" : "Comience agregando la primera solicitud al sistema"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primera Solicitud
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabla (desktop) */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Lista de Solicitudes de Contrato</CardTitle>
          <CardDescription>
            {filteredContracts.length} de {totalContracts} solicitudes mostradas
            {searchTerm && ` - Filtrado por: "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">ID</TableHead>
                  <TableHead className="min-w-[150px]">Código</TableHead>
                  <TableHead className="min-w-[100px]">Modalidad</TableHead>
                  <TableHead className="min-w-[100px]">Docentes</TableHead>
                  <TableHead className="min-w-[100px]">Horas</TableHead>
                  <TableHead className="min-w-[200px]">Solicitante</TableHead>
                  <TableHead className="min-w-[150px]">Departamento</TableHead>
                  <TableHead className="min-w-[120px]">Fecha Inicio</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="text-right min-w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((c) => (
                  <TableRow key={c.requestId} className="group">
                    <TableCell className="font-medium">
                      <div className="font-mono">#{c.requestId}</div>
                    </TableCell>
                    <TableCell>{c.contractCode || "N/A"}</TableCell>
                    <TableCell>{c.workModalityId}</TableCell>
                    <TableCell>{c.numberTeacher}</TableCell>
                    <TableCell>{c.numberHour}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-500" />
                        {c.applicantName || "No especificado"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3 text-gray-500" />
                        {c.department || "No especificado"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-500" />
                        {c.startDate ? new Date(c.startDate).toLocaleDateString() : "No definida"}
                      </div>
                      {c.daysRemaining && c.daysRemaining < 30 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs mt-1">
                          {c.daysRemaining}d
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.statusVariant}
                        className={
                          c.status === 1 || c.status === 3
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : c.status === 2
                            ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }
                      >
                        {c.statusText}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(c)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Detalles
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredContracts.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "No se encontraron solicitudes" : "No hay solicitudes de contrato registradas"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "Intente con otros términos de búsqueda"
                  : "Comience agregando la primera solicitud al sistema"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primera Solicitud
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de detalles */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Solicitud de Contrato</DialogTitle>
            <DialogDescription>Información completa de la solicitud seleccionada.</DialogDescription>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-6 mt-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                    {selectedContract.contractCode || `Contrato #${selectedContract.requestId}`}
                  </h2>
                  <p className="text-gray-600">Detalles de la solicitud de contrato</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">Información Principal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">ID de Solicitud</label>
                      <p className="font-mono font-medium break-all">#{selectedContract.requestId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Modalidad de Trabajo</label>
                      <p className="font-medium">{selectedContract.workModalityId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Número de Docentes</label>
                      <p className="font-medium">{selectedContract.numberTeacher}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Número de Horas</label>
                      <p className="font-medium">{selectedContract.numberHour}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">Información del Contrato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Código de Contrato</label>
                      <p className="font-medium">{selectedContract.contractCode || "No especificado"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Número de Contrato</label>
                      <p className="font-medium">{selectedContract.contractNumber || "No especificado"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tipo de Contrato</label>
                      <p className="font-medium">{selectedContract.contractType || "No especificado"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Estado</label>
                      <Badge
                        variant={selectedContract.statusVariant}
                        className={
                          selectedContract.status === 1 || selectedContract.status === 3
                            ? "bg-green-100 text-green-800"
                            : selectedContract.status === 2
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {selectedContract.statusText}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">Información Personal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Solicitante</label>
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {selectedContract.applicantName || "No especificado"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Departamento</label>
                      <p className="font-medium flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {selectedContract.department || "No especificado"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cargo</label>
                      <p className="font-medium">{selectedContract.position || "No especificado"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Salario</label>
                      <p className="font-medium text-lg text-green-600">
                        {selectedContract.salary ? `$${selectedContract.salary.toLocaleString()}` : "No especificado"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">Fechas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha de Inicio</label>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {selectedContract.startDate ? new Date(selectedContract.startDate).toLocaleDateString() : "No definida"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha de Fin</label>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {selectedContract.endDate ? new Date(selectedContract.endDate).toLocaleDateString() : "No definida"}
                      </p>
                    </div>
                    {selectedContract.daysRemaining && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tiempo Restante</label>
                        <p className="font-medium flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {selectedContract.daysRemaining > 0
                            ? `${selectedContract.daysRemaining} días hasta la expiración`
                            : "Expirado"}
                        </p>
                        {selectedContract.daysRemaining < 30 && selectedContract.daysRemaining > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 mt-1">
                            Próximo a vencer
                          </Badge>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha de Creación</label>
                      <p className="font-medium">
                        {selectedContract.createdAt ? new Date(selectedContract.createdAt).toLocaleDateString() : "No disponible"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="w-full sm:w-auto">
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}