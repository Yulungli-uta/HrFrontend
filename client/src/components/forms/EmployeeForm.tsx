import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@/shared/schema";
import {
  UserCog,
  Save,
  X,
  Mail,
  ChevronsUpDown,
  Check,
  Loader2,
} from "lucide-react";
import {
  PersonasAPI,
  DepartamentosAPI,
  EmpleadosAPI,
  TiposReferenciaAPI,
  VistaEmpleadosAPI,
  type ApiResponse,
  type PagedResult,
} from "@/lib/api";
import type { PersonDto } from "@/lib/api/services/employees";
import { cn } from "@/lib/utils";

type EmployeeViewSeed = {
  employeeID: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  idCard?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  sex?: string;
  address?: string;
  hireDate?: string;
  employeeIsActive?: boolean;
  employeeType?: number | null;
  employeeTypeName?: string | null;
  department?: string | null;
  faculty?: string | null;
  immediateBoss?: string | null;
  yearsOfService?: number;
  maritalStatus?: string | null;
  ethnicity?: string | null;
  bloodType?: string | null;
  disabilityPercentage?: number | null;
  conadisCard?: string | null;
  countryName?: string | null;
  provinceName?: string | null;
  cantonName?: string | null;
};

interface RefType {
  typeId: number;
  name: string;
  category: string;
}

interface EmployeeFormProps {
  employee?: Employee;
  viewSeed?: EmployeeViewSeed;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type EmployeeFormData = {
  personId: number;
  email: string;
  contractTypeId?: number;
  departmentId: number | null;
  immediateBossId: number | null;
  hireDate: string;
  isActive: boolean;
};

interface ComboboxOption {
  value: number;
  label: string;
  detail?: string;
}

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";
const COMBOBOX_PAGE_SIZE = 15;
const DEBOUNCE_MS = 400;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface UsePagedComboboxOptions<T> {
  queryKey: string;
  queryFn: (params: {
    page: number;
    pageSize: number;
    search?: string;
  }) => Promise<ApiResponse<PagedResult<T>>>;
  mapFn: (item: T) => ComboboxOption | null;
  enabled?: boolean;
}

function usePagedCombobox<T>({
  queryKey,
  queryFn,
  mapFn,
  enabled = true,
}: UsePagedComboboxOptions<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, DEBOUNCE_MS);

  const params = useMemo(
    () => ({
      page: 1,
      pageSize: COMBOBOX_PAGE_SIZE,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [debouncedSearch]
  );

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, "paged-combobox", params],
    queryFn: () => queryFn(params),
    enabled,
    staleTime: 30_000,
  });

  const options = useMemo(() => {
    if (data?.status !== "success" || !data.data?.items) return [];
    return data.data.items.map(mapFn).filter(Boolean) as ComboboxOption[];
  }, [data, mapFn]);

  return { options, isLoading, searchTerm, setSearchTerm };
}

export default function EmployeeForm({
  employee,
  viewSeed,
  onSuccess,
  onCancel,
}: EmployeeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [personOpen, setPersonOpen] = useState(false);
  const [bossOpen, setBossOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);

  const [personLabel, setPersonLabel] = useState<string | null>(null);
  const [bossLabel, setBossLabel] = useState<string | null>(null);
  const [deptLabel, setDeptLabel] = useState<string | null>(null);

  const { data: refTypes, isLoading: loadingRefTypes } = useQuery<
    ApiResponse<RefType[]>
  >({
    queryKey: ["refTypes"],
    queryFn: TiposReferenciaAPI.list,
  });

  const contractOptions = useMemo(() => {
    const arr = refTypes?.status === "success" ? refTypes.data ?? [] : [];
    return arr.filter(
      (t) => t?.category === "CONTRACT_TYPE" && typeof t.typeId === "number"
    );
  }, [refTypes]);

  const mapPerson = useCallback((p: PersonDto): ComboboxOption | null => {
    if (!p?.personId) return null;
    return {
      value: p.personId,
      label: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(),
      detail: p.idCard ?? undefined,
    };
  }, []);

  const personCombobox = usePagedCombobox<PersonDto>({
    queryKey: "people",
    queryFn: (params) => PersonasAPI.listPaged(params),
    mapFn: mapPerson,
  });

  const mapDepartment = useCallback((d: any): ComboboxOption | null => {
    const did = Number(d?.departmentId ?? d?.id ?? d?.DepartmentId ?? 0);
    if (!did || did <= 0) return null;

    return {
      value: did,
      label: String(d?.name ?? d?.Name ?? `Departamento #${did}`),
    };
  }, []);

  const deptCombobox = usePagedCombobox<any>({
    queryKey: "departments",
    queryFn: (params) => DepartamentosAPI.listPaged(params),
    mapFn: mapDepartment,
  });

  const mapBoss = useCallback((e: any): ComboboxOption | null => {
    const id = Number(e?.employeeID ?? e?.employeeId ?? e?.id ?? 0);
    if (!id || id <= 0) return null;

    const name = String(
      e?.fullName ?? `${e?.firstName ?? ""} ${e?.lastName ?? ""}`.trim()
    );

    return {
      value: id,
      label: name || `Empleado #${id}`,
      detail: e?.idCard ?? undefined,
    };
  }, []);

  const bossCombobox = usePagedCombobox<any>({
    queryKey: "employees-boss",
    queryFn: (params) => VistaEmpleadosAPI.listPaged(params),
    mapFn: mapBoss,
  });

  const isEditingFromEmployee = !!employee?.id;
  const [employeeIdForUpdate, setEmployeeIdForUpdate] = useState<number | null>(
    employee?.id ?? null
  );

  const form = useForm<EmployeeFormData>({
    defaultValues: {
      personId: 0,
      contractTypeId: undefined,
      departmentId: employee?.departmentId ?? null,
      immediateBossId: employee?.immediateBossId ?? null,
      hireDate: employee?.hireDate ?? "",
      isActive: employee?.isActive ?? true,
      email: "",
    },
    mode: "onChange",
  });

  const validateDate = (value?: string | null) => {
    if (!value) return "La fecha de contratación es obligatoria";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const input = new Date(value);
    input.setHours(0, 0, 0, 0);

    if (input > today) return "La fecha de contratación no puede ser futura";
    return true;
  };

  const validateEmail = (value?: string | null) => {
    if (!value) return "El email es obligatorio";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Formato de email inválido";

    return true;
  };

  const findContractTypeIdFromEmployeeType = (
    employeeType?: number | null
  ) => {
    if (employeeType == null) return undefined;
    const rt = contractOptions.find(
      (r) => Number(r.typeId) === Number(employeeType)
    );
    return rt?.typeId ?? undefined;
  };

  const hydratedRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;

    if (!viewSeed) {
      form.reset({
        personId: 0,
        contractTypeId: undefined,
        departmentId: null,
        immediateBossId: null,
        hireDate: "",
        isActive: true,
        email: "",
      });
      setEmployeeIdForUpdate(null);
      setPersonLabel(null);
      setBossLabel(null);
      setDeptLabel(null);
      return;
    }

    if (loadingRefTypes) return;

    const contractTypeId = findContractTypeIdFromEmployeeType(
      viewSeed.employeeType ?? null
    );

    const resolveEmployeeId = async () => {
      try {
        const empResp = await EmpleadosAPI.get(viewSeed.employeeID);

        if (empResp.status === "success" && empResp.data) {
          const empData = empResp.data as any;

          const employeeId =
            empData.employeeId ??
            empData.EmployeeId ??
            viewSeed.employeeID;

          const personId =
            empData.personID ??
            empData.personId ??
            empData.PersonID ??
            0;

          const departmentId =
            empData.departmentId ??
            empData.DepartmentId ??
            null;

          const immediateBossId =
            empData.immediateBossId ??
            empData.ImmediateBossId ??
            null;

          const employeeType =
            empData.employeeType ??
            empData.EmployeeType ??
            contractTypeId;

          const email =
            empData.email ??
            empData.Email ??
            viewSeed.email ??
            "";

          setEmployeeIdForUpdate(employeeId);

          form.reset({
            personId,
            contractTypeId: employeeType,
            departmentId,
            immediateBossId,
            hireDate: viewSeed.hireDate ?? "",
            isActive: viewSeed.employeeIsActive ?? true,
            email,
          });

          const fullName =
            viewSeed.fullName ??
            `${viewSeed.firstName ?? ""} ${viewSeed.lastName ?? ""}`.trim();

          setPersonLabel(
            fullName
              ? `${fullName}${viewSeed.idCard ? ` — ${viewSeed.idCard}` : ""}`
              : null
          );
          setBossLabel(viewSeed.immediateBoss ?? null);
          setDeptLabel(viewSeed.department ?? null);

          if (DEBUG) {
            console.group("Hydrate EmployeeForm from viewSeed");
            console.log("viewSeed:", viewSeed);
            console.log("employee record:", empData);
            console.log("employeeId:", employeeId);
            console.log("personId:", personId);
            console.log("departmentId:", departmentId);
            console.log("immediateBossId:", immediateBossId);
            console.log("employeeType:", employeeType);
            console.groupEnd();
          }
        }
      } catch {
        setEmployeeIdForUpdate(viewSeed.employeeID);

        form.reset({
          personId: 0,
          contractTypeId,
          departmentId: null,
          immediateBossId: null,
          hireDate: viewSeed.hireDate ?? "",
          isActive: viewSeed.employeeIsActive ?? true,
          email: viewSeed.email ?? "",
        });

        const fullName =
          viewSeed.fullName ??
          `${viewSeed.firstName ?? ""} ${viewSeed.lastName ?? ""}`.trim();

        setPersonLabel(
          fullName
            ? `${fullName}${viewSeed.idCard ? ` — ${viewSeed.idCard}` : ""}`
            : null
        );
        setBossLabel(viewSeed.immediateBoss ?? null);
        setDeptLabel(viewSeed.department ?? null);
      }

      hydratedRef.current = true;
    };

    resolveEmployeeId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewSeed, contractOptions, loadingRefTypes]);

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const payload = {
        employeeId: 0,
        personID: data.personId,
        employeeType: data.contractTypeId ?? 0,
        departmentId: data.departmentId,
        immediateBossId: data.immediateBossId,
        hireDate: data.hireDate,
        email: data.email,
        isActive: data.isActive,
        createdAt: new Date().toISOString(),
      };

      const res = await EmpleadosAPI.create(payload as any);
      if (res.status === "error") {
        throw new Error(res.error?.message ?? "Error desconocido");
      }

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/employees"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/rh/vw/EmployeeComplete"],
      });
      queryClient.invalidateQueries({ queryKey: ["employees-complete"] });
      toast({ title: "Empleado creado exitosamente" });
      onSuccess?.();
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      toast({
        title: "Error al crear empleado",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const empId = employeeIdForUpdate ?? employee?.id;
      if (!empId) {
        throw new Error("ID de empleado no disponible para edición.");
      }

      const payload = {
        employeeId: empId,
        personID: data.personId,
        employeeType: data.contractTypeId ?? 0,
        departmentId: data.departmentId,
        immediateBossId: data.immediateBossId,
        hireDate: data.hireDate,
        email: data.email,
        isActive: data.isActive,
      };

      const res = await EmpleadosAPI.update(empId, payload as any);
      if (res.status === "error") {
        throw new Error(res.error?.message ?? "Error desconocido");
      }

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/employees"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/rh/vw/EmployeeComplete"],
      });
      queryClient.invalidateQueries({ queryKey: ["employees-complete"] });
      toast({ title: "Empleado actualizado exitosamente" });
      onSuccess?.();
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      toast({
        title: "Error al actualizar empleado",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    if (DEBUG) {
      console.log("Submit Employee:", {
        data,
        employeeIdForUpdate,
        viewSeed,
        employee,
      });
    }

    if (!data.personId || data.personId <= 0) {
      toast({
        title: "Seleccione la Persona titular",
        variant: "destructive",
      });
      return;
    }

    if (!data.contractTypeId || data.contractTypeId <= 0) {
      toast({
        title: "Seleccione el tipo de contrato",
        variant: "destructive",
      });
      return;
    }

    const dateCheck = validateDate(data.hireDate);
    if (dateCheck !== true) {
      toast({ title: String(dateCheck), variant: "destructive" });
      return;
    }

    const emailCheck = validateEmail(data.email);
    if (emailCheck !== true) {
      toast({ title: String(emailCheck), variant: "destructive" });
      return;
    }

    if (employeeIdForUpdate || isEditingFromEmployee) {
      updateMutation.mutate(data, {
        onSuccess: () => setEmployeeIdForUpdate(null),
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const disabling = loadingRefTypes || isSaving;
  const lockPersonSelect = !!(employeeIdForUpdate || isEditingFromEmployee);

  const currentPersonId = form.watch("personId");
  const currentBossId = form.watch("immediateBossId");
  const currentDeptId = form.watch("departmentId");

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          <span>
            {employeeIdForUpdate || isEditingFromEmployee
              ? "Editar Empleado"
              : "Agregar Nuevo Empleado"}
          </span>
        </CardTitle>
        <CardDescription>
          {employeeIdForUpdate || isEditingFromEmployee
            ? "Modifique la información del empleado"
            : "Complete los datos del nuevo empleado"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="personId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Persona *</FormLabel>
                    <Popover open={personOpen} onOpenChange={setPersonOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={personOpen}
                            disabled={disabling || lockPersonSelect}
                            data-testid="select-person"
                            className={cn(
                              "w-full justify-between font-normal",
                              !currentPersonId && "text-muted-foreground"
                            )}
                          >
                            <span className="truncate">
                              {currentPersonId && personLabel
                                ? personLabel
                                : "Buscar persona..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nombre o cédula..."
                            value={personCombobox.searchTerm}
                            onValueChange={personCombobox.setSearchTerm}
                          />
                          <CommandList>
                            {personCombobox.isLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">
                                  Buscando...
                                </span>
                              </div>
                            ) : (
                              <>
                                <CommandEmpty>
                                  No se encontraron personas.
                                </CommandEmpty>
                                <CommandGroup>
                                  {personCombobox.options.map((opt) => (
                                    <CommandItem
                                      key={opt.value}
                                      value={String(opt.value)}
                                      onSelect={() => {
                                        field.onChange(opt.value);
                                        setPersonLabel(
                                          `${opt.label}${
                                            opt.detail ? ` — ${opt.detail}` : ""
                                          }`
                                        );
                                        setPersonOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          currentPersonId === opt.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium truncate">
                                          {opt.label}
                                        </span>
                                        {opt.detail && (
                                          <span className="text-xs text-muted-foreground">
                                            {opt.detail}
                                          </span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          className="pl-10"
                          disabled={disabling}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de contrato *</FormLabel>
                    <Select
                      disabled={disabling}
                      onValueChange={(value) =>
                        field.onChange(
                          value === "empty" ? undefined : parseInt(value, 10)
                        )
                      }
                      value={field.value ? String(field.value) : "empty"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              loadingRefTypes
                                ? "Cargando tipos..."
                                : "Seleccione tipo de contrato"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="empty">Sin especificar</SelectItem>
                        {contractOptions.map((opt) => (
                          <SelectItem
                            key={`contr-${opt.typeId}`}
                            value={String(opt.typeId)}
                          >
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Departamento</FormLabel>
                    <Popover open={deptOpen} onOpenChange={setDeptOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={deptOpen}
                            disabled={disabling}
                            data-testid="select-department"
                            className={cn(
                              "w-full justify-between font-normal",
                              !currentDeptId && "text-muted-foreground"
                            )}
                          >
                            <span className="truncate">
                              {currentDeptId && deptLabel
                                ? deptLabel
                                : currentDeptId
                                ? `Departamento #${currentDeptId}`
                                : "Buscar departamento..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar departamento..."
                            value={deptCombobox.searchTerm}
                            onValueChange={deptCombobox.setSearchTerm}
                          />
                          <CommandList>
                            {deptCombobox.isLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">
                                  Buscando...
                                </span>
                              </div>
                            ) : (
                              <>
                                <CommandEmpty>
                                  No se encontraron departamentos.
                                </CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="null"
                                    onSelect={() => {
                                      field.onChange(null);
                                      setDeptLabel(null);
                                      setDeptOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        currentDeptId === null
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <span className="text-sm text-muted-foreground italic">
                                      Sin departamento
                                    </span>
                                  </CommandItem>

                                  {deptCombobox.options.map((opt) => (
                                    <CommandItem
                                      key={opt.value}
                                      value={String(opt.value)}
                                      onSelect={() => {
                                        field.onChange(opt.value);
                                        setDeptLabel(opt.label);
                                        setDeptOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          currentDeptId === opt.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <span className="text-sm font-medium truncate">
                                        {opt.label}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="immediateBossId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Jefe Inmediato</FormLabel>
                    <Popover open={bossOpen} onOpenChange={setBossOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={bossOpen}
                            disabled={disabling}
                            data-testid="select-boss"
                            className={cn(
                              "w-full justify-between font-normal",
                              !currentBossId && "text-muted-foreground"
                            )}
                          >
                            <span className="truncate">
                              {currentBossId && bossLabel
                                ? bossLabel
                                : currentBossId
                                ? `Empleado #${currentBossId}`
                                : "Buscar jefe..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nombre..."
                            value={bossCombobox.searchTerm}
                            onValueChange={bossCombobox.setSearchTerm}
                          />
                          <CommandList>
                            {bossCombobox.isLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">
                                  Buscando...
                                </span>
                              </div>
                            ) : (
                              <>
                                <CommandEmpty>
                                  No se encontraron empleados.
                                </CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="null"
                                    onSelect={() => {
                                      field.onChange(null);
                                      setBossLabel(null);
                                      setBossOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        currentBossId === null
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <span className="text-sm text-muted-foreground italic">
                                      Sin jefe asignado
                                    </span>
                                  </CommandItem>

                                  {bossCombobox.options
                                    .filter(
                                      (opt) =>
                                        !currentPersonId ||
                                        opt.value !== currentPersonId
                                    )
                                    .map((opt) => (
                                      <CommandItem
                                        key={opt.value}
                                        value={String(opt.value)}
                                        onSelect={() => {
                                          field.onChange(opt.value);
                                          setBossLabel(opt.label);
                                          setBossOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            currentBossId === opt.value
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-sm font-medium truncate">
                                            {opt.label}
                                          </span>
                                          {opt.detail && (
                                            <span className="text-xs text-muted-foreground">
                                              {opt.detail}
                                            </span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Contratación *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        data-testid="input-hireDate"
                        max={new Date().toISOString().slice(0, 10)}
                        disabled={disabling}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Estado Activo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Indique si el empleado está activo en el sistema
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                      data-testid="switch-isActive"
                      disabled={disabling}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1"
                data-testid="button-save-employee"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving
                  ? "Guardando..."
                  : employeeIdForUpdate || isEditingFromEmployee
                  ? "Actualizar"
                  : "Crear Empleado"}
              </Button>

              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}