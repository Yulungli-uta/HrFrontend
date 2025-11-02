// src/pages/CertificationFinance.tsx
import { useMemo, useState, useEffect } from "react";
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
  FileText, Plus, Search, Clock, Calendar, DollarSign, Eye, CheckCircle, Download,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import ReusableFileUpload from "@/components/ReusableFileUpload";
import {
  FinancialCertificationAPI,
  FileManagementAPI,
  DirectoryParametersAPI,
  type ApiResponse
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/** ===== Tipos ===== */
interface FinancialCertification {
  requestId: number;
  certCode: string;
  certNumber: string;
  budget: string;
  certBudgetDate: string;
  rmuHour: number;
  rmuCon: number;
  filename?: string;
  filepath?: string;
  createdAt: string;
  createdBy: number;
  status: number;
}

interface UIFinancialCertification extends FinancialCertification {
  isActive: boolean;
  totalAmount: number;
  daysUntilExpiry?: number;
  statusText: string;
  statusVariant: "default" | "secondary" | "destructive" | "outline";
}

type DirectoryParameter = {
  directoryId: number;
  code: string;           // ej: "FINCERT"
  physicalPath: string;   // ej: "\\\\nas11...\\Certificacion\\"
  relativePath: string;   // ej: "/financial-certifications/"
  description?: string;
  extension?: string;     // ej: "pdf"
  maxSizeMb?: number;     // ej: 25
  status?: boolean;
  createdAt?: string;
  createdBy?: number | null;
  updatedAt?: string | null;
  updatedBy?: number | null;
};

/** ===================== Página ===================== */
export default function FinancialCertificationPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, employeeDetails } = useAuth();

  // Preferimos employeeDetails.employeeID (numérico)
  const ctxCreatedBy = Number.isFinite(Number(employeeDetails?.employeeID))
    ? Number(employeeDetails?.employeeID)
    : (Number.isFinite(Number(user?.id)) ? Number(user?.id) : 0);

  // Diálogos / estado general
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState<UIFinancialCertification | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ----------------- DirectoryParameter: FINCERT -----------------
  const {
    data: dirResp,
    isLoading: isDirLoading,
    isError: isDirError,
    refetch: refetchDir
  } = useQuery<ApiResponse<DirectoryParameter>>({
    queryKey: ["directory-parameter", "FINCERT"],
    queryFn: () => DirectoryParametersAPI.getByCode("FINCERT"),
    staleTime: 5 * 60 * 1000,
  });

  const dirParam: DirectoryParameter | undefined =
    dirResp?.status === "success" ? dirResp.data : undefined;

  const directoryCode = dirParam?.code ?? "FINCERT";
  const uploadMaxSizeMB = Number(dirParam?.maxSizeMb ?? 25);
  const uploadAccept =
    dirParam?.extension
      ? `.${String(dirParam.extension).replace(/^\./, "").toLowerCase()}`
      : ".pdf";
  // Si la API te da rutas UNC, usa un valor relativo válido para el backend
  const normalizedRelativePath =
    (dirParam?.relativePath && dirParam.relativePath.trim().length > 0)
      ? dirParam.relativePath
      : "/financial-certifications/";

  useEffect(() => {
    // re-validar parámetro si reabres el formulario, opcional
    if (isFormOpen) refetchDir();
  }, [isFormOpen, refetchDir]);

  // ----------------- Estado del formulario de creación -----------------
  const [form, setForm] = useState<Partial<FinancialCertification>>({
    certCode: "",
    certNumber: "",
    budget: "",
    certBudgetDate: new Date().toISOString(),
    rmuHour: 0,
    rmuCon: 0,
    filename: undefined,
    filepath: undefined,
    createdAt: new Date().toISOString(),
    createdBy: ctxCreatedBy,
    status: 2, // Pendiente
  });

  // ----------------- Query de listado -----------------
  const { data: apiResponse, isLoading, error } = useQuery<ApiResponse<FinancialCertification[]>>({
    queryKey: ['/api/v1/rh/cv/financial-certification'],
    queryFn: () => FinancialCertificationAPI.list(),
  });

  // ----------------- Mutación de creación -----------------
  const createMutation = useMutation({
    mutationFn: (payload: FinancialCertification) => FinancialCertificationAPI.create(payload as any),
    onSuccess: (resp) => {
      if (resp.status === "success") {
        toast({
          title: "✅ Certificación creada",
          description: "Se guardó correctamente en el sistema."
        });
        qc.invalidateQueries({ queryKey: ['/api/v1/rh/cv/financial-certification'] });
        setIsFormOpen(false);
        resetForm();
      } else {
        toast({
          title: "❌ Error al guardar",
          description: resp.error?.message ?? "No se pudo guardar la certificación",
          variant: "destructive"
        });
      }
    },
    onError: (e: any) => {
      toast({
        title: "❌ Error de conexión",
        description: e?.message ?? "No se pudo conectar con el servidor",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setForm({
      certCode: "",
      certNumber: "",
      budget: "",
      certBudgetDate: new Date().toISOString(),
      rmuHour: 0,
      rmuCon: 0,
      filename: undefined,
      filepath: undefined,
      createdAt: new Date().toISOString(),
      createdBy: Number.isFinite(Number(employeeDetails?.employeeID))
        ? Number(employeeDetails?.employeeID)
        : (Number.isFinite(Number(user?.id)) ? Number(user?.id) : 0),
      status: 2,
    });
  };

  // ----------------- Helpers de UI -----------------
  const getStatusInfo = (status: number): { text: string; variant: UIFinancialCertification["statusVariant"] } => {
    switch (status) {
      case 1: return { text: "Activo", variant: "default" };
      case 2: return { text: "Pendiente", variant: "secondary" };
      case 3: return { text: "Aprobado", variant: "default" };
      case 4: return { text: "Rechazado", variant: "destructive" };
      case 0: return { text: "Inactivo", variant: "outline" };
      default: return { text: "Desconocido", variant: "outline" };
    }
  };

  const getDaysUntilExpiry = (certBudgetDate: string): number => {
    const expiryDate = new Date(certBudgetDate);
    expiryDate.setMonth(expiryDate.getMonth() + 6);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const certifications: UIFinancialCertification[] = useMemo(() => {
    if (apiResponse?.status !== "success") return [];
    return apiResponse.data.map((cert) => {
      const statusInfo = getStatusInfo(cert.status);
      const daysUntilExpiry = getDaysUntilExpiry(cert.certBudgetDate);
      return {
        ...cert,
        isActive: cert.status === 1 || cert.status === 3,
        totalAmount: (cert.rmuHour ?? 0) * (cert.rmuCon ?? 0),
        daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : undefined,
        statusText: statusInfo.text,
        statusVariant: statusInfo.variant,
      };
    });
  }, [apiResponse]);

  const filteredCertifications = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return certifications.filter((c) =>
      c.certCode.toLowerCase().includes(q) ||
      c.certNumber.toLowerCase().includes(q) ||
      c.budget.toLowerCase().includes(q) ||
      c.statusText.toLowerCase().includes(q)
    );
  }, [searchTerm, certifications]);

  // Stats
  const totalCertifications = certifications.length;
  const approvedCertifications = certifications.filter(c => c.status === 3).length;
  const pendingCertifications = certifications.filter(c => c.status === 2).length;
  const totalBudget = certifications.reduce((sum, cert) => sum + cert.totalAmount, 0);
  const expiringSoon = certifications.filter(c => c.daysUntilExpiry && c.daysUntilExpiry < 30).length;

  // Ver detalles
  const handleViewDetails = (c: UIFinancialCertification) => {
    setSelectedCertification(c);
    setIsDetailOpen(true);
  };

  // Descargar archivo — usa directoryCode del parámetro
  const downloadFile = async (directoryCodeParam: string, filePath: string, suggestedName?: string) => {
    try {
      const resp = await FileManagementAPI.downloadFile(directoryCodeParam, filePath);
      if (resp.status === "success") {
        const blob = resp.data as unknown as Blob;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName ?? "archivo";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        toast({ title: "No se pudo descargar", description: resp.error?.message ?? "Error desconocido", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error de red al descargar", description: e?.message, variant: "destructive" });
    }
  };

  // ----------------- Render -----------------
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
              Error al cargar las certificaciones financieras. {apiResponse?.status === "error" ? apiResponse.error.message : "Intente nuevamente."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            Gestión de Certificaciones Financieras
          </h1>
          <p className="text-gray-600 mt-1 lg:mt-2 text-sm lg:text-base">
            Administre las certificaciones financieras del sistema
          </p>
          <div className="mt-2 text-xs text-gray-600">
            <span className="font-medium">Directorio:</span>{" "}
            {isDirLoading
              ? "Cargando parámetros FINCERT..."
              : isDirError
              ? "No se pudo cargar FINCERT (usando valores por defecto)"
              : `${directoryCode} → ext: ${uploadAccept}, máx: ${uploadMaxSizeMB}MB`}
          </div>
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
              Agregar Certificación
            </Button>
          </DialogTrigger>

          {/* ------------------- FORMULARIO ------------------- */}
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Certificación Financiera</DialogTitle>
              <DialogDescription>
                Completa los campos requeridos y selecciona el archivo. Al subirlo, se guardará automáticamente el registro.
              </DialogDescription>
            </DialogHeader>

            {/* Campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="certCode">Código *</Label>
                <Input
                  id="certCode"
                  value={form.certCode ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, certCode: e.target.value }))}
                  placeholder="Ej: CERT-2025-001"
                />
              </div>
              <div>
                <Label htmlFor="certNumber">Número *</Label>
                <Input
                  id="certNumber"
                  value={form.certNumber ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, certNumber: e.target.value }))}
                  placeholder="Ej: 1100"
                />
              </div>
              <div>
                <Label htmlFor="budget">Presupuesto *</Label>
                <Input
                  id="budget"
                  value={form.budget ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                  placeholder="Ej: Cert. 1100 / POA 2025"
                />
              </div>
              <div>
                <Label htmlFor="certBudgetDate">Fecha de Certificación *</Label>
                <Input
                  id="certBudgetDate"
                  type="date"
                  value={(form.certBudgetDate ? new Date(form.certBudgetDate) : new Date())
                    .toISOString().slice(0, 10)}
                  onChange={(e) => {
                    const dateStr = e.target.value;
                    const iso = new Date(`${dateStr}T00:00:00`).toISOString();
                    setForm((f) => ({ ...f, certBudgetDate: iso }));
                  }}
                />
              </div>
              <div>
                <Label htmlFor="rmuHour">RMU por Hora</Label>
                <Input
                  id="rmuHour"
                  type="number"
                  step="0.01"
                  value={form.rmuHour ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, rmuHour: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="rmuCon">RMU por Contrato</Label>
                <Input
                  id="rmuCon"
                  type="number"
                  step="0.01"
                  value={form.rmuCon ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, rmuCon: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="createdBy">Creado por (ID usuario)</Label>
                <Input id="createdBy" type="number" value={ctxCreatedBy} disabled />
                <p className="text-xs text-muted-foreground mt-1">
                  Se toma del usuario en sesión {employeeDetails?.fullName ? `(${employeeDetails.fullName})` : ""}.
                </p>
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

            {/* Subida + Guardado Automático */}
            <div className="mt-6">
              <Label className="mb-2 block">Documento de respaldo *</Label>
              <ReusableFileUpload
                label={createMutation.isPending ? "Guardando..." : "Seleccionar archivo de certificación"}
                directoryCode={directoryCode}
                relativePath={normalizedRelativePath}
                accept={uploadAccept}
                maxSizeMB={uploadMaxSizeMB}
                disabled={createMutation.isPending}
                onUploaded={async (data: any) => {
                  try {
                    // Validaciones de campos obligatorios ANTES de guardar automáticamente
                    if (!form.certCode?.trim() || !form.certNumber?.trim() || !form.budget?.trim()) {
                      toast({
                        title: "⚠️ Datos incompletos",
                        description: "Completa Código, Número y Presupuesto antes de subir el archivo.",
                        variant: "destructive",
                      });
                      return;
                    }

                    const filename =
                      data?.filename || data?.fileName || data?.data?.fileName || data?.name;
                    const filepath =
                      data?.filepath || data?.filePath || data?.data?.filePath || data?.relativePath;

                    if (!filename || !filepath) {
                      toast({
                        title: "❌ Error en respuesta",
                        description: "No se pudo obtener el nombre o la ruta del archivo subido.",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Actualiza form con datos del archivo
                    setForm((f) => ({ ...f, filename, filepath }));

                    // Construir payload para guardar
                    const payload: FinancialCertification = {
                      requestId: 0,
                      certCode: form.certCode!.trim(),
                      certNumber: form.certNumber!.trim(),
                      budget: form.budget!.trim(),
                      certBudgetDate: form.certBudgetDate!,
                      rmuHour: form.rmuHour ?? 0,
                      rmuCon: form.rmuCon ?? 0,
                      filename,
                      filepath,
                      createdAt: new Date().toISOString(),
                      createdBy: ctxCreatedBy,
                      status: form.status ?? 2,
                    };

                    // Guardado automático (mutateAsync para esperar la respuesta)
                    await createMutation.mutateAsync(payload);
                  } catch (err: any) {
                    toast({
                      title: "❌ Error inesperado",
                      description: err?.message ?? "No se pudo guardar la certificación automáticamente.",
                      variant: "destructive",
                    });
                  }
                }}
                onError={(msg) => {
                  toast({
                    title: "❌ Error al subir archivo",
                    description: msg,
                    variant: "destructive",
                  });
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Al completar los campos requeridos y subir el archivo, se creará automáticamente el registro.
              </p>
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
                {totalCertifications}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">Certificaciones registradas</div>
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
                {approvedCertifications}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">
              {totalCertifications > 0 ? ((approvedCertifications / totalCertifications) * 100).toFixed(1) : 0}% del total
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
                {pendingCertifications}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">
              {totalCertifications > 0 ? ((pendingCertifications / totalCertifications) * 100).toFixed(1) : 0}% del total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <DollarSign className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600 mr-2" />
                Presupuesto Total
              </span>
              <Badge variant="secondary" className="bg-purple-200 text-purple-800 text-xs lg:text-sm">
                ${totalBudget.toLocaleString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-gray-600">Monto total certificado</div>
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
            placeholder="Buscar certificación por código, número, presupuesto o estado..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Cards (móvil) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredCertifications.map((c) => (
          <Card key={c.requestId} className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="truncate">{c.certCode}</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <span className="font-medium">N°:</span> {c.certNumber} ·{" "}
                    <span className="font-medium">Presupuesto:</span> {c.budget}
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
                    <Calendar className="h-4 w-4" />
                    {new Date(c.certBudgetDate).toLocaleDateString()}
                  </div>
                  {c.daysUntilExpiry && c.daysUntilExpiry < 30 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs mt-1">
                      {c.daysUntilExpiry}d
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Monto: ${c.totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {c.filename && c.filepath && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(directoryCode, c.filepath!, c.filename!)}
                    className="h-8"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Descargar
                  </Button>
                )}
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

        {filteredCertifications.length === 0 && (
          <Card className="text-center py-10">
            <CardContent>
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                {searchTerm ? "No se encontraron certificaciones" : "No hay certificaciones registradas"}
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                {searchTerm ? "Intente con otros términos de búsqueda" : "Comience agregando la primera certificación al sistema"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primera Certificación
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabla (desktop) */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Lista de Certificaciones Financieras</CardTitle>
          <CardDescription>
            {filteredCertifications.length} de {totalCertifications} certificaciones mostradas
            {searchTerm && ` - Filtrado por: "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Código</TableHead>
                  <TableHead className="min-w-[150px]">Número</TableHead>
                  <TableHead className="min-w-[150px]">Presupuesto</TableHead>
                  <TableHead className="min-w-[120px]">RMU Hora</TableHead>
                  <TableHead className="min-w-[120px]">RMU Contrato</TableHead>
                  <TableHead className="min-w-[120px]">Monto Total</TableHead>
                  <TableHead className="min-w-[120px]">Fecha</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="text-right min-w-[190px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertifications.map((c) => (
                  <TableRow key={c.requestId} className="group">
                    <TableCell className="font-medium">
                      <div className="font-mono">{c.certCode}</div>
                    </TableCell>
                    <TableCell>{c.certNumber}</TableCell>
                    <TableCell>{c.budget}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-gray-500" />${c.rmuHour.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-gray-500" />${c.rmuCon.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-medium">
                        <DollarSign className="h-3 w-3 text-gray-500" />${c.totalAmount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-500" />
                        {new Date(c.certBudgetDate).toLocaleDateString()}
                      </div>
                      {c.daysUntilExpiry && c.daysUntilExpiry < 30 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs mt-1">
                          {c.daysUntilExpiry}d
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
                        {c.filename && c.filepath && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(directoryCode, c.filepath!, c.filename!)}
                            className="h-8"
                            title="Descargar archivo"
                          >
                            <Download className="h-3 w-3 mr-2" />
                            Descargar
                          </Button>
                        )}
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

          {filteredCertifications.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "No se encontraron certificaciones" : "No hay certificaciones registradas"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "Intente con otros términos de búsqueda"
                  : "Comience agregando la primera certificación al sistema"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primera Certificación
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
            <DialogTitle>Detalles de Certificación</DialogTitle>
            <DialogDescription>Información completa de la certificación seleccionada.</DialogDescription>
          </DialogHeader>

          {selectedCertification && (
            <div className="space-y-6 mt-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                    {selectedCertification.certCode} - {selectedCertification.certNumber}
                  </h2>
                  <p className="text-gray-600">Detalles de la certificación financiera</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Código de Certificación</label>
                      <p className="font-mono font-medium break-all">{selectedCertification.certCode}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Número de Certificación</label>
                      <p className="font-medium break-words">{selectedCertification.certNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Presupuesto</label>
                      <p className="font-medium break-words">{selectedCertification.budget}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha de Certificación</label>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(selectedCertification.certBudgetDate).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">Detalles Financieros</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">RMU por Hora</label>
                      <p className="font-medium flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${selectedCertification.rmuHour.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">RMU por Contrato</label>
                      <p className="font-medium flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${selectedCertification.rmuCon.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Monto Total</label>
                      <p className="font-medium flex items-center gap-1 text-lg text-green-600">
                        <DollarSign className="h-5 w-5" />
                        ${selectedCertification.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Estado</label>
                      <Badge
                        variant={selectedCertification.statusVariant}
                        className={
                          selectedCertification.status === 1 || selectedCertification.status === 3
                            ? "bg-green-100 text-green-800"
                            : selectedCertification.status === 2
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {selectedCertification.statusText}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">Información Adicional</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Archivo</label>
                        <p className="font-medium">
                          {selectedCertification.filename ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="truncate max-w-[220px] md:max-w-none">{selectedCertification.filename}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => downloadFile(directoryCode, selectedCertification.filepath!, selectedCertification.filename!)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Descargar
                              </Button>
                            </div>
                          ) : ("No especificado")}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Ruta del Archivo</label>
                        <p className="font-medium font-mono text-sm break-all">
                          {selectedCertification.filepath || "No especificado"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Creado por</label>
                        <p className="font-medium">
                          Usuario #{selectedCertification.createdBy}
                          {employeeDetails?.employeeID === selectedCertification.createdBy && employeeDetails?.fullName
                            ? ` (${employeeDetails.fullName})`
                            : ""}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Fecha de Creación</label>
                        <p className="font-medium">
                          {new Date(selectedCertification.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {selectedCertification.daysUntilExpiry && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tiempo Restante</label>
                        <p className="font-medium flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {selectedCertification.daysUntilExpiry > 0
                            ? `${selectedCertification.daysUntilExpiry} días hasta la expiración`
                            : "Expirado"}
                        </p>
                        {selectedCertification.daysUntilExpiry < 30 && selectedCertification.daysUntilExpiry > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 mt-1">
                            Próximo a vencer
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="w-full sm:w-auto">
                  Cerrar
                </Button>
                <Button onClick={() => setIsDetailOpen(false)} className="w-full sm:w-auto">
                  Editar Certificación
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
