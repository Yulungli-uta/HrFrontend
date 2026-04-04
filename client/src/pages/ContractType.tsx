import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Search,
  Clock,
  Calendar,
  DollarSign,
  BookOpen,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ContractTypeForm } from "@/components/forms/ContractTypeForm";
import { ContractTypeAPI, type ApiResponse } from "@/lib/api";

// ---------------- TIPOS ----------------

interface ContractType {
  contractTypeId: number;
  personalContractTypeId: number;
  name: string;
  description?: string;
  status: string; // "1" activo, "0" inactivo
  contractText: string;
  contractCode: string;
}

interface UIContractType {
  contractTypeId: number;
  name: string;
  code: string;
  description?: string;
  durationDays?: number;
  isRenewable: boolean;
  requiresProbation: boolean;
  probationDays?: number;
  isActive: boolean;
  category?: string;
  maxSalary?: number;
  minSalary?: number;
  legalRequirements?: string;
  contractText?: string;
  personalContractTypeId?: number;
  status?: string;
}

// --------------- PAGE -------------------

export default function ContractTypesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedContractType, setSelectedContractType] =
    useState<UIContractType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingContract, setEditingContract] =
    useState<UIContractType | null>(null);

  const {
    data: apiResponse,
    isLoading,
    error,
  } = useQuery<ApiResponse<ContractType[]>>({
    queryKey: ["/api/v1/rh/contract-type"],
    queryFn: () =>
      ContractTypeAPI.list() as Promise<ApiResponse<ContractType[]>>,
  });

  // --------- Helpers de negocio ---------

  const getCategoryFromCode = (code: string): string => {
    const categoryMap: Record<string, string> = {
      DTH: "Docente",
      Administrativo: "Administrativo",
      Adendum: "Adendum",
    };
    return categoryMap[code] || "General";
  };

  const getIsRenewable = (contract: ContractType): boolean => {
    const texto = contract.contractText?.toLowerCase?.() ?? "";
    return texto.includes("renovado automáticamente");
  };

  const getDurationDays = (contract: ContractType): number => {
    if (contract.contractCode === "DTH") return 365;
    if (contract.contractCode === "Administrativo") return 180;
    return 365;
  };

  const contractTypes: UIContractType[] = useMemo(() => {
    if (apiResponse?.status !== "success") return [];

    return apiResponse.data.map((contract) => ({
      contractTypeId: contract.contractTypeId,
      name: contract.name,
      code: contract.contractCode,
      description: contract.description,
      durationDays: getDurationDays(contract),
      isRenewable: getIsRenewable(contract),
      requiresProbation: contract.contractCode === "Administrativo",
      probationDays:
        contract.contractCode === "Administrativo" ? 90 : undefined,
      isActive: contract.status === "1",
      category: getCategoryFromCode(contract.contractCode),
      minSalary: contract.contractCode === "DTH" ? 1500 : 800,
      maxSalary: contract.contractCode === "DTH" ? 3000 : 2000,
      legalRequirements:
        "Cumplir con la Ley Orgánica de Educación Superior y Reglamento Interno",
      contractText: contract.contractText,
      personalContractTypeId: contract.personalContractTypeId,
      status: contract.status,
    }));
  }, [apiResponse]);

  const filteredContractTypes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return contractTypes;

    return contractTypes.filter((contractType) => {
      const name = contractType.name.toLowerCase();
      const code = contractType.code.toLowerCase();
      const description = contractType.description?.toLowerCase() ?? "";
      const category = contractType.category?.toLowerCase() ?? "";

      return (
        name.includes(term) ||
        code.includes(term) ||
        description.includes(term) ||
        category.includes(term)
      );
    });
  }, [contractTypes, searchTerm]);

  const {
    totalContractTypes,
    activeContractTypes,
    inactiveContractTypes,
    renewableContractTypes,
    probationContractTypes,
    avgDuration,
  } = useMemo(() => {
    const total = contractTypes.length;
    const active = contractTypes.filter((ct) => ct.isActive).length;
    const inactive = contractTypes.filter((ct) => !ct.isActive).length;
    const renewable = contractTypes.filter((ct) => ct.isRenewable).length;
    const probation = contractTypes.filter((ct) => ct.requiresProbation).length;

    const avg =
      total > 0
        ? Math.round(
            contractTypes.reduce(
              (sum, ct) => sum + (ct.durationDays || 0),
              0
            ) / total
          )
        : 0;

    return {
      totalContractTypes: total,
      activeContractTypes: active,
      inactiveContractTypes: inactive,
      renewableContractTypes: renewable,
      probationContractTypes: probation,
      avgDuration: avg,
    };
  }, [contractTypes]);

  const handleViewDetails = (contractType: UIContractType) => {
    setSelectedContractType(contractType);
    setIsDetailOpen(true);
  };

  // --------------- Loading / error ----------------

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex space-x-4 animate-pulse">
              <div className="h-12 flex-1 bg-muted rounded" />
              <div className="h-12 flex-1 bg-muted rounded" />
              <div className="h-12 flex-1 bg-muted rounded" />
              <div className="h-12 flex-1 bg-muted rounded" />
              <div className="h-12 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error al cargar los tipos de contrato. Intente nuevamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (apiResponse?.status === "error") {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error al cargar los tipos de contrato:{" "}
              {apiResponse.error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --------------- Render principal ----------------

  return (
    <div className="container mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            Gestión de Tipos de Contrato
          </h1>
          <p className="text-muted-foreground mt-2 text-sm lg:text-base">
            Administre los diferentes tipos de contrato laboral del sistema
          </p>
        </div>

        {/* Dialog de creación / edición */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
              data-testid="button-add-contract-type"
              onClick={() => {
                setFormMode("create");
                setEditingContract(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Tipo de Contrato
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {formMode === "create"
                  ? "Nuevo Tipo de Contrato"
                  : "Editar Tipo de Contrato"}
              </DialogTitle>
              <DialogDescription>
                Complete la información del tipo de contrato.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <ContractTypeForm
                key={formMode + (editingContract?.contractTypeId ?? "new")}
                mode={formMode}
                contractId={editingContract?.contractTypeId}
                initialValues={
                  editingContract
                    ? {
                        name: editingContract.name,
                        code: editingContract.code,
                        description: editingContract.description,
                        contractText: editingContract.contractText,
                        isActive: editingContract.isActive,
                        personalContractTypeId: editingContract.personalContractTypeId
                          ? String(editingContract.personalContractTypeId)
                          : "",
                      }
                    : undefined
                }
                onCancel={() => setIsFormOpen(false)}
                onSuccess={() => setIsFormOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-primary mr-2" />
                Total
              </span>
              <Badge className="bg-blue-200 text-primary text-xs lg:text-sm">
                {totalContractTypes}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-muted-foreground">
              Tipos registrados
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <div className="h-4 w-4 lg:h-5 lg:w-5 bg-success/15 rounded-full flex items-center justify-center mr-2">
                  <div className="h-2 w-2 bg-success rounded-full" />
                </div>
                Activos
              </span>
              <Badge className="bg-success/20 text-success text-xs lg:text-sm">
                {activeContractTypes}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-muted-foreground">
              {totalContractTypes > 0
                ? ((activeContractTypes / totalContractTypes) * 100).toFixed(1)
                : 0}
              % del total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-secondary-foreground mr-2" />
                Renovables
              </span>
              <Badge className="bg-orange-200 text-secondary-foreground text-xs lg:text-sm">
                {renewableContractTypes}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-muted-foreground">
              {totalContractTypes > 0
                ? ((renewableContractTypes / totalContractTypes) * 100).toFixed(
                    1
                  )
                : 0}
              % del total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600 mr-2" />
                Con Período Prueba
              </span>
              <Badge className="bg-purple-200 text-accent-foreground text-xs lg:text-sm">
                {probationContractTypes}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-muted-foreground">
              Duración avg: {avgDuration} días
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
              <span className="flex items-center">
                <BookOpen className="h-4 w-4 lg:h-5 lg:w-5 text-destructive mr-2" />
                Legales
              </span>
              <Badge className="bg-destructive/20 text-destructive text-xs lg:text-sm">
                {contractTypes.filter((ct) => ct.legalRequirements).length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs lg:text-sm text-muted-foreground">
              Con requisitos legales
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tipo de contrato por nombre, código, descripción o categoría..."
            aria-label="Buscar tipo de contrato"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Tipos de Contrato</CardTitle>
          <CardDescription>
            {filteredContractTypes.length} de {totalContractTypes} tipos
            mostrados
            {searchTerm && ` - Filtrado por: "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">
                    Tipo de Contrato
                  </TableHead>
                  <TableHead className="min-w-[120px]">Código</TableHead>
                  <TableHead className="min-w-[150px] hidden md:table-cell">
                    Categoría
                  </TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">
                    Duración
                  </TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">
                    Renovable
                  </TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="text-right min-w-[140px]">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContractTypes.map((contractType) => (
                  <TableRow
                    key={contractType.contractTypeId}
                    className="group"
                  >
                    <TableCell>
                      <div>
                        <div
                          className="font-medium"
                          data-testid={`text-contract-type-name-${contractType.contractTypeId}`}
                        >
                          {contractType.name}
                        </div>
                        {contractType.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {contractType.description}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell
                      className="font-mono font-medium"
                      data-testid={`text-contract-type-code-${contractType.contractTypeId}`}
                    >
                      {contractType.code}
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      {contractType.category ? (
                        <Badge variant="outline" className="bg-background">
                          {contractType.category}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {contractType.durationDays
                            ? `${contractType.durationDays} días`
                            : "Indefinido"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={
                          contractType.isRenewable
                            ? "bg-success/10 text-success border-success/30"
                            : "bg-background text-foreground border-border"
                        }
                      >
                        {contractType.isRenewable ? "Sí" : "No"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={contractType.isActive ? "default" : "secondary"}
                        className={
                          contractType.isActive
                            ? "bg-success/15 text-success hover:bg-success/15"
                            : "bg-muted text-foreground hover:bg-muted"
                        }
                        data-testid={`status-active-${contractType.contractTypeId}`}
                      >
                        {contractType.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(contractType)}
                        data-testid={`button-view-contract-type-${contractType.contractTypeId}`}
                        className="inline-flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span className="hidden sm:inline">Ver Detalles</span>
                        <span className="sm:hidden">Ver</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredContractTypes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm
                  ? "No se encontraron tipos de contrato"
                  : "No hay tipos de contrato registrados"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "Intente con otros términos de búsqueda"
                  : "Comience agregando el primer tipo de contrato al sistema"}
              </p>
              {!searchTerm && (
                <Button
                  data-testid="button-add-first-contract-type"
                  onClick={() => {
                    setFormMode("create");
                    setEditingContract(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primer Tipo de Contrato
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
            <DialogTitle>Detalles del Tipo de Contrato</DialogTitle>
            <DialogDescription>
              Información completa del tipo de contrato seleccionado.
            </DialogDescription>
          </DialogHeader>

          {selectedContractType && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/15 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-foreground">
                    {selectedContractType.name}
                  </h2>
                  <p className="text-muted-foreground">
                    Detalles del tipo de contrato
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">
                      Información General
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Código
                      </label>
                      <p className="font-mono font-medium">
                        {selectedContractType.code}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Categoría
                      </label>
                      <p className="font-medium">
                        {selectedContractType.category || "No especificada"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Descripción
                      </label>
                      <p className="font-medium">
                        {selectedContractType.description || "No especificada"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        ID Original
                      </label>
                      <p className="font-medium">
                        {selectedContractType.contractTypeId}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base lg:text-lg">
                      Características
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Duración
                      </label>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {selectedContractType.durationDays
                          ? `${selectedContractType.durationDays} días`
                          : "Contrato indefinido"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Renovable
                      </label>
                      <Badge
                        className={
                          selectedContractType.isRenewable
                            ? "bg-success/15 text-success"
                            : "bg-muted text-foreground"
                        }
                      >
                        {selectedContractType.isRenewable ? "Sí" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Período de Prueba
                      </label>
                      <p className="font-medium">
                        {selectedContractType.requiresProbation
                          ? `${
                              selectedContractType.probationDays || 30
                            } días`
                          : "No requiere"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Estado
                      </label>
                      <Badge
                        className={
                          selectedContractType.isActive
                            ? "bg-success/15 text-success"
                            : "bg-muted text-foreground"
                        }
                      >
                        {selectedContractType.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {(selectedContractType.minSalary ||
                  selectedContractType.maxSalary) && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Rango Salarial
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Salario Mínimo
                          </label>
                          <p className="font-medium">
                            {selectedContractType.minSalary
                              ? `$${selectedContractType.minSalary.toLocaleString()}`
                              : "No definido"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Salario Máximo
                          </label>
                          <p className="font-medium">
                            {selectedContractType.maxSalary
                              ? `$${selectedContractType.maxSalary.toLocaleString()}`
                              : "No definido"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedContractType.legalRequirements && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Requisitos Legales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground">
                        {selectedContractType.legalRequirements}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {selectedContractType.contractText && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Texto del Contrato
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-60 overflow-y-auto p-3 bg-background rounded-md">
                        <pre className="text-sm text-foreground whitespace-pre-wrap">
                          {selectedContractType.contractText.substring(0, 500)}
                          ...
                        </pre>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Mostrando primeros 500 caracteres de{" "}
                        {selectedContractType.contractText.length} totales
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    if (selectedContractType) {
                      setIsDetailOpen(false);
                      setFormMode("edit");
                      setEditingContract(selectedContractType);
                      setIsFormOpen(true);
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  Editar Tipo de Contrato
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
