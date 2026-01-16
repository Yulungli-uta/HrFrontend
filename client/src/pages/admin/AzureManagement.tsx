import { useEffect, useMemo, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";

import {
  Users as UsersIcon,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Edit,
  Shield,
  Bug,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { AzureManagementAPI } from "@/lib/api/auth";
import AzureUserForm, { type AzureUserFormMode } from "@/components/forms/AzureUserForm";

/** =========================================================
 *  DEBUG FLAG: solo muestra Debug si VITE_DEBUG_AUTH === "true"
 *  ========================================================= */
const DEBUG_AUTH =
  String((import.meta as any)?.env?.VITE_DEBUG_AUTH || "").toLowerCase() === "true";

/** =========================================================
 *  TYPES
 *  ========================================================= */
type AzureUser = {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  email?: string;
  userPrincipalName?: string;
  department?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  accountEnabled?: boolean;
  userType?: string;
  createdDateTime?: string;
};

type AzureRole = {
  id?: string;
  displayName?: string;
  description?: string;
  roleTemplateId?: string;
};

type PagedMeta = {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

type DebugEvent = { at: string; action: string; detail?: any };

/** =========================================================
 *  HELPERS
 *  ========================================================= */
function pickErrorMessage(err: any, fallback: string) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

function safeTrim(s: any) {
  return String(s ?? "").trim();
}

function normalizeAzureUser(raw: any): AzureUser {
  if (!raw) return raw;

  const email = raw.email ?? raw.mail ?? raw.userPrincipalName ?? "";
  const upn = raw.userPrincipalName ?? raw.upn ?? "";

  return {
    id: raw.id,
    displayName: raw.displayName ?? "",
    givenName: raw.givenName ?? "",
    surname: raw.surname ?? "",
    email,
    userPrincipalName: upn,
    department: raw.department ?? "",
    jobTitle: raw.jobTitle ?? "",
    officeLocation: raw.officeLocation ?? "",
    mobilePhone: raw.mobilePhone ?? "",
    businessPhones: raw.businessPhones ?? [],
    accountEnabled: raw.accountEnabled ?? true,
    userType: raw.userType ?? "",
    createdDateTime: raw.createdDateTime ?? "",
  };
}

function normalizeRole(raw: any): AzureRole {
  return {
    id: raw?.id,
    displayName: raw?.displayName ?? raw?.name ?? "",
    description: raw?.description ?? "",
    roleTemplateId: raw?.roleTemplateId ?? "",
  };
}

/**
 * Extrae meta de paginación si existe, sin romper si no existe.
 */
function extractPagedMeta(payload: any): PagedMeta {
  if (!payload || typeof payload !== "object") return {};

  const meta =
    payload.meta ||
    payload.pagination ||
    payload.pageInfo ||
    payload.pagedMeta ||
    payload;

  const page = Number(meta.page ?? meta.currentPage ?? payload.page);
  const pageSize = Number(meta.pageSize ?? meta.perPage ?? payload.pageSize);
  const total = Number(meta.total ?? meta.totalCount ?? payload.total);
  const totalPages = Number(meta.totalPages ?? meta.pages ?? payload.totalPages);

  return {
    page: Number.isFinite(page) ? page : undefined,
    pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
    total: Number.isFinite(total) ? total : undefined,
    totalPages: Number.isFinite(totalPages) ? totalPages : undefined,
  };
}

/**
 * Intenta convertir a array desde varias convenciones típicas
 */
function coerceToArray<T>(payload: any): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.value)) return payload.value;
  if (Array.isArray(payload.users)) return payload.users;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

/**
 * IMPORTANTE: corrige tu bug principal.
 * Soporta:
 * - axios: { data: ... }
 * - backend: { success: true, data: ... }
 * - backend: { Success: true, Data: ... }
 */
function unwrapBackendPayload(res: any) {
  if (!res) return res;

  // axios típico
  const first = typeof res === "object" && "data" in res ? (res as any).data : res;

  // PascalCase
  if (first && typeof first === "object" && "Success" in first) {
    if (!(first as any).Success) {
      const msg = (first as any).Message || "Respuesta backend con error";
      throw new Error(msg);
    }
    return (first as any).Data ?? null;
  }

  // camelCase
  if (first && typeof first === "object" && "success" in first) {
    if (!(first as any).success) {
      const msg = (first as any).message || "Respuesta backend con error";
      throw new Error(msg);
    }
    return (first as any).data ?? null;
  }

  return first;
}

/** =========================================================
 *  TOOLTIP BUTTON (reusable)
 *  ========================================================= */
function IconTooltipButton({
  label,
  children,
  ...buttonProps
}: ComponentProps<typeof Button> & { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...buttonProps}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent side="top" align="center">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/** =========================================================
 *  COMPONENT
 *  ========================================================= */
export default function AzureManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debug events solo si DEBUG_AUTH
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const pushDebug = (action: string, detail?: any) => {
    if (!DEBUG_AUTH) return;
    const ev: DebugEvent = { at: new Date().toISOString(), action, detail };
    setDebugEvents((prev) => [ev, ...prev].slice(0, 50));
    // eslint-disable-next-line no-console
    console.log(`[DEBUG_AUTH] ${action}`, detail ?? "");
  };

  /** UI state */
  const [searchTerm, setSearchTerm] = useState("");
  const [serverFilter, setServerFilter] = useState("");

  // ✅ búsqueda backend por correo
  const [emailLookup, setEmailLookup] = useState("");
  const [foundUser, setFoundUser] = useState<AzureUser | null>(null);
  const [foundOpen, setFoundOpen] = useState(false);

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [goToPageInput, setGoToPageInput] = useState("1");

  // form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<AzureUserFormMode>("create");
  const [editingUser, setEditingUser] = useState<AzureUser | null>(null);

  // confirm dialogs
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; permanent: boolean } | null>(null);
  const [toggleTarget, setToggleTarget] = useState<{ id: string; enable: boolean } | null>(null);
  const [resetPwdTarget, setResetPwdTarget] = useState<{ id: string; forceChange: boolean } | null>(null);

  // roles
  const [rolesOpen, setRolesOpen] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesTargetUser, setRolesTargetUser] = useState<AzureUser | null>(null);
  const [roles, setRoles] = useState<AzureRole[]>([]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
    setGoToPageInput("1");
  }, [serverFilter, pageSize]);

  // ✅ sincroniza el input de ir-a-página cuando navegas con botones
  useEffect(() => {
    setGoToPageInput(String(page));
  }, [page]);

  /** =========================================================
   *  LIST USERS
   *  ========================================================= */
  const usersQuery = useQuery({
    queryKey: ["azure-users", page, pageSize, serverFilter],
    queryFn: async () => {
      pushDebug("LIST_USERS:request", { page, pageSize, serverFilter });

      const res = await AzureManagementAPI.listUsers(
        page,
        pageSize,
        serverFilter ? serverFilter : undefined
      );

      pushDebug("LIST_USERS:response(raw)", res);

      const payload = unwrapBackendPayload(res);
      pushDebug("LIST_USERS:payload(unwrapped)", payload);

      const meta = extractPagedMeta(payload);
      const list = coerceToArray<any>(payload);
      const users = list.map(normalizeAzureUser).filter((u) => u?.id);

      pushDebug("LIST_USERS:parsed", { meta, count: users.length });

      return { users, meta, raw: payload };
    },
    staleTime: 30_000,
    retry: 1,
    onError: (err: any) => {
      const msg = pickErrorMessage(err, "No se pudo obtener usuarios de Azure");
      pushDebug("LIST_USERS:error", { msg, err });
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const users = usersQuery.data?.users ?? [];
  const meta = usersQuery.data?.meta ?? {};
  const rawPayload = usersQuery.data?.raw;

  /** =========================================================
   *  FRONT FILTER (searchTerm)
   *  ========================================================= */
  const filteredUsers = useMemo(() => {
    const term = safeTrim(searchTerm).toLowerCase();
    if (!term) return users;

    return users.filter((u) => {
      const hay = [u.displayName, u.email, u.userPrincipalName, u.department, u.userType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(term);
    });
  }, [users, searchTerm]);

  const uiCurrentPage = meta.page ?? page;
  const uiTotalPages = meta.totalPages;

  const goToPage = () => {
    const n = Number(goToPageInput);
    if (!Number.isFinite(n) || n <= 0) {
      toast({
        title: "Página inválida",
        description: "Ingresa un número de página válido.",
        variant: "destructive",
      });
      return;
    }
    setPage(Math.trunc(n));
  };

  // ✅ navegación segura
  const canPrev = uiCurrentPage > 1 && !usersQuery.isFetching;
  const canNext =
    !usersQuery.isFetching &&
    (typeof uiTotalPages === "number" ? uiCurrentPage < uiTotalPages : true);

  const goPrev = () => {
    if (!canPrev) return;
    const prev = Math.max(1, uiCurrentPage - 1);
    setPage(prev);
  };

  const goNext = () => {
    if (!canNext) return;
    const next =
      typeof uiTotalPages === "number"
        ? Math.min(uiTotalPages, uiCurrentPage + 1)
        : uiCurrentPage + 1;
    setPage(next);
  };

  /** =========================================================
   *  MUTATIONS
   *  ========================================================= */
  const deleteMutation = useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent: boolean }) => {
      pushDebug("DELETE_USER:request", { id, permanent });
      return AzureManagementAPI.deleteUser(id, permanent);
    },
    onSuccess: (res: any) => {
      pushDebug("DELETE_USER:success", res);
      toast({ title: "Usuario eliminado", description: "Se eliminó el usuario en Azure." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["azure-users"] });
    },
    onError: (err: any) => {
      const msg = pickErrorMessage(err, "No se pudo eliminar el usuario");
      pushDebug("DELETE_USER:error", { msg, err });
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) => {
      pushDebug("TOGGLE_USER:request", { id, enable });
      return enable ? AzureManagementAPI.enableUser(id) : AzureManagementAPI.disableUser(id);
    },
    onSuccess: (res: any) => {
      pushDebug("TOGGLE_USER:success", res);
      toast({ title: "Estado actualizado", description: "Se actualizó el estado del usuario." });
      setToggleTarget(null);
      queryClient.invalidateQueries({ queryKey: ["azure-users"] });
    },
    onError: (err: any) => {
      const msg = pickErrorMessage(err, "No se pudo actualizar el estado");
      pushDebug("TOGGLE_USER:error", { msg, err });
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: ({ id, forceChange }: { id: string; forceChange: boolean }) => {
      pushDebug("RESET_PASSWORD:request", { id, forceChange });
      return AzureManagementAPI.resetPassword(id, forceChange);
    },
    onSuccess: (res: any) => {
      pushDebug("RESET_PASSWORD:success", res);
      toast({ title: "Contraseña reseteada", description: "Solicitud enviada al backend." });
      setResetPwdTarget(null);
    },
    onError: (err: any) => {
      const msg = pickErrorMessage(err, "No se pudo resetear la contraseña");
      pushDebug("RESET_PASSWORD:error", { msg, err });
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  // ✅ BÚSQUEDA POR CORREO (backend)
  const emailLookupMutation = useMutation({
    mutationFn: async (email: string) => {
      const clean = safeTrim(email);
      pushDebug("GET_USER_BY_EMAIL:request", { email: clean });

      const res = await AzureManagementAPI.getUserByEmail(clean);
      pushDebug("GET_USER_BY_EMAIL:response(raw)", res);

      const payload = unwrapBackendPayload(res);
      pushDebug("GET_USER_BY_EMAIL:payload(unwrapped)", payload);

      const user = normalizeAzureUser(payload);
      if (!user?.id) throw new Error("No se encontró el usuario con ese correo.");
      return user;
    },
    onSuccess: (u) => {
      setFoundUser(u);
      setFoundOpen(true);
      toast({ title: "Usuario encontrado", description: u.email || u.userPrincipalName });
    },
    onError: (err: any) => {
      const msg = pickErrorMessage(err, "No se encontró el usuario con ese correo");
      pushDebug("GET_USER_BY_EMAIL:error", { msg, err });
      toast({ title: "No encontrado", description: msg, variant: "destructive" });
    },
  });

  // roles modal
  const openRoles = async (u: AzureUser) => {
    setRolesTargetUser(u);
    setRolesOpen(true);
    setRolesLoading(true);
    setRolesError(null);
    setRoles([]);

    try {
      pushDebug("GET_USER_ROLES:request", { id: u.id });
      const res = await AzureManagementAPI.getUserAzureRoles(u.id);
      pushDebug("GET_USER_ROLES:response(raw)", res);

      const payload = unwrapBackendPayload(res);
      const list = coerceToArray<any>(payload);
      const rolesParsed = list.map(normalizeRole);

      setRoles(rolesParsed);
      pushDebug("GET_USER_ROLES:parsed", { count: rolesParsed.length });
    } catch (err: any) {
      const msg = pickErrorMessage(err, "No se pudieron obtener roles");
      setRolesError(msg);
      pushDebug("GET_USER_ROLES:error", { msg, err });
    } finally {
      setRolesLoading(false);
    }
  };

  /** =========================================================
   *  FORM handlers
   *  ========================================================= */
  const openCreate = () => {
    setEditingUser(null);
    setFormMode("create");
    setIsFormOpen(true);
    pushDebug("FORM:openCreate");
  };

  const openEdit = (u: AzureUser) => {
    setEditingUser(u);
    setFormMode("edit");
    setIsFormOpen(true);
    pushDebug("FORM:openEdit", { id: u.id });
  };

  /** =========================================================
   *  BLOCKING overlay
   *  ========================================================= */
  const isBlocking =
    usersQuery.isFetching ||
    usersQuery.isLoading ||
    emailLookupMutation.isPending ||
    deleteMutation.isPending ||
    toggleMutation.isPending ||
    resetPwdMutation.isPending ||
    rolesLoading;

  /** =========================================================
   *  RENDER
   *  ========================================================= */
  return (
    <TooltipProvider delayDuration={150}>
      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <UsersIcon className="h-7 w-7 md:h-8 md:w-8" />
              Usuarios (Azure AD)
            </h1>
            <p className="text-gray-600 mt-1 md:mt-2">
              Lista desde Graph (backend) + acciones + roles por usuario.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Button variant="outline" onClick={() => usersQuery.refetch()} disabled={usersQuery.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${usersQuery.isFetching ? "animate-spin" : ""}`} />
              Actualizar
            </Button>

            <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Crear usuario
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar (cliente): nombre, email, UPN, depto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Filtro servidor (OData filter)"
                value={serverFilter}
                onChange={(e) => setServerFilter(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPage(1);
                    setGoToPageInput("1");
                    usersQuery.refetch();
                  }}
                >
                  Aplicar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setServerFilter("");
                    setPage(1);
                    setGoToPageInput("1");
                    usersQuery.refetch();
                  }}
                >
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por correo (backend): ejemplo@uta.edu.ec"
                    value={emailLookup}
                    onChange={(e) => setEmailLookup(e.target.value)}
                    className="pl-10"
                    disabled={emailLookupMutation.isPending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = safeTrim(emailLookup);
                        if (v) emailLookupMutation.mutate(v);
                      }
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const v = safeTrim(emailLookup);
                    if (v) emailLookupMutation.mutate(v);
                  }}
                  disabled={emailLookupMutation.isPending || !safeTrim(emailLookup)}
                >
                  <Search className={`mr-2 h-4 w-4 ${emailLookupMutation.isPending ? "animate-spin" : ""}`} />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meta / paginación */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Meta:</span>{" "}
                Página <b>{uiCurrentPage}</b>
                {typeof uiTotalPages === "number" ? (
                  <>
                    {" "}de <b>{uiTotalPages}</b>
                  </>
                ) : null}
                {typeof meta.total === "number" ? (
                  <>
                    {" "}· Total <b>{meta.total}</b>
                  </>
                ) : null}
                {" "}· Mostrando <b>{filteredUsers.length}</b>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                {/* ✅ Navegación Prev/Next */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={goPrev} disabled={!canPrev}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button variant="outline" onClick={goNext} disabled={!canNext}>
                    Siguiente
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Page size:</span>
                  <Input
                    className="w-24"
                    type="number"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value) || 50)}
                    min={1}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Ir a página:</span>
                  <Input
                    className="w-24"
                    value={goToPageInput}
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goToPage();
                    }}
                  />
                  <Button variant="outline" onClick={goToPage}>
                    Ir
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardContent className="pt-6">
            {usersQuery.isLoading ? (
              <div className="flex items-center gap-2 text-gray-700">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando usuarios...
              </div>
            ) : usersQuery.isError ? (
              <div className="text-sm text-red-600">Ocurrió un error cargando usuarios.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredUsers.map((u) => {
                      const enabled = u.accountEnabled !== false;

                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.displayName || "-"}</TableCell>
                          <TableCell className="max-w-[320px] truncate">{u.email || "-"}</TableCell>
                          <TableCell>{u.userType || "-"}</TableCell>
                          <TableCell>
                            {enabled ? (
                              <Badge className="bg-green-600 hover:bg-green-600">Habilitado</Badge>
                            ) : (
                              <Badge variant="secondary">Deshabilitado</Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <IconTooltipButton
                                label="Editar"
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(u)}
                              >
                                <Edit className="h-4 w-4" />
                              </IconTooltipButton>

                              <IconTooltipButton
                                label="Ver grupos o membresía"
                                variant="outline"
                                size="sm"
                                onClick={() => openRoles(u)}
                              >
                                <Shield className="h-4 w-4" />
                              </IconTooltipButton>

                              {enabled ? (
                                <IconTooltipButton
                                  label="Deshabilitar usuario"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setToggleTarget({ id: u.id, enable: false })}
                                >
                                  <ShieldOff className="h-4 w-4" />
                                </IconTooltipButton>
                              ) : (
                                <IconTooltipButton
                                  label="Habilitar usuario"
                                  size="sm"
                                  onClick={() => setToggleTarget({ id: u.id, enable: true })}
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                </IconTooltipButton>
                              )}

                              <IconTooltipButton
                                label="Resetear contraseña"
                                size="sm"
                                onClick={() => setResetPwdTarget({ id: u.id, forceChange: true })}
                              >
                                <KeyRound className="h-4 w-4" />
                              </IconTooltipButton>

                              <IconTooltipButton
                                label="Eliminar usuario"
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteTarget({ id: u.id, permanent: false })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </IconTooltipButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultado búsqueda por correo */}
        <Dialog
          open={foundOpen}
          onOpenChange={(open) => {
            setFoundOpen(open);
            if (!open) setFoundUser(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Resultado de búsqueda</DialogTitle>
              <DialogDescription>Registro encontrado en Azure AD (backend).</DialogDescription>
            </DialogHeader>

            {foundUser ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-800">
                      <div>
                        <div className="text-gray-500">Nombre</div>
                        <div className="font-medium">{foundUser.displayName || "-"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Correo</div>
                        <div className="font-medium">{foundUser.email || "-"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Tipo</div>
                        <div className="font-medium">{foundUser.userType || "-"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Estado</div>
                        <div className="font-medium">
                          {foundUser.accountEnabled !== false ? (
                            <Badge className="bg-green-600 hover:bg-green-600">Habilitado</Badge>
                          ) : (
                            <Badge variant="secondary">Deshabilitado</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      openEdit(foundUser);
                      setFoundOpen(false);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar / Tramitar
                  </Button>

                  <Button variant="outline" onClick={() => openRoles(foundUser)}>
                    <Shield className="mr-2 h-4 w-4" />
                    Ver grupos o membresía
                  </Button>

                  {foundUser.accountEnabled !== false ? (
                    <Button variant="secondary" onClick={() => setToggleTarget({ id: foundUser.id, enable: false })}>
                      <ShieldOff className="mr-2 h-4 w-4" />
                      Deshabilitar
                    </Button>
                  ) : (
                    <Button onClick={() => setToggleTarget({ id: foundUser.id, enable: true })}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Habilitar
                    </Button>
                  )}

                  <Button onClick={() => setResetPwdTarget({ id: foundUser.id, forceChange: true })}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset clave
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">No hay datos para mostrar.</div>
            )}
          </DialogContent>
        </Dialog>

        {/* Form create/edit */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{formMode === "edit" ? "Editar usuario (Azure)" : "Crear usuario (Azure)"}</DialogTitle>
              <DialogDescription>
                Complete los campos y guarde para {formMode === "edit" ? "actualizar" : "crear"} el usuario.
              </DialogDescription>
            </DialogHeader>

            {/* ✅ FIX CRÍTICO: el form espera prop "user", no "initialUser" */}
            {/* ✅ key: fuerza reset total de estados al cambiar de usuario/mode */}
            <AzureUserForm
              key={`${formMode}-${editingUser?.id ?? "new"}`}
              mode={formMode}
              user={editingUser}
              onSuccess={() => {
                setIsFormOpen(false);
                queryClient.invalidateQueries({ queryKey: ["azure-users"] });
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción eliminará el usuario en Azure AD.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!deleteTarget) return;
                  deleteMutation.mutate(deleteTarget);
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Toggle confirm */}
        <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar acción</AlertDialogTitle>
              <AlertDialogDescription>
                {toggleTarget?.enable ? "¿Habilitar este usuario?" : "¿Deshabilitar este usuario?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!toggleTarget) return;
                  toggleMutation.mutate(toggleTarget);
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset confirm */}
        <AlertDialog open={!!resetPwdTarget} onOpenChange={(open) => !open && setResetPwdTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset contraseña</AlertDialogTitle>
              <AlertDialogDescription>Se enviará una solicitud de reset de contraseña al backend.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!resetPwdTarget) return;
                  resetPwdMutation.mutate(resetPwdTarget);
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Roles modal */}
        <Dialog
          open={rolesOpen}
          onOpenChange={(open) => {
            setRolesOpen(open);
            if (!open) {
              setRolesTargetUser(null);
              setRoles([]);
              setRolesError(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Roles del usuario</DialogTitle>
              <DialogDescription>
                Usuario: <b>{rolesTargetUser?.displayName || "-"}</b> ·{" "}
                {rolesTargetUser?.email || rolesTargetUser?.userPrincipalName || "-"}
              </DialogDescription>
            </DialogHeader>

            {rolesLoading ? (
              <div className="flex items-center gap-2 text-gray-700">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando roles...
              </div>
            ) : rolesError ? (
              <div className="text-sm text-red-600">{rolesError}</div>
            ) : roles.length === 0 ? (
              <div className="text-sm text-gray-600">No se encontraron roles para este usuario.</div>
            ) : (
              <div className="space-y-2">
                {roles.map((r, idx) => (
                  <div key={`${r.id ?? "role"}-${idx}`} className="border rounded-md p-3 text-sm">
                    <div className="font-medium">{r.displayName || "-"}</div>
                    {r.description ? <div className="text-gray-600 mt-1">{r.description}</div> : null}
                    {r.roleTemplateId ? (
                      <div className="text-gray-500 mt-1">
                        Template: <code>{r.roleTemplateId}</code>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Debug panel SOLO si DEBUG_AUTH === true */}
        {DEBUG_AUTH ? (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="h-4 w-4" />
                <div className="font-semibold">Debug</div>
              </div>

              <div className="text-xs text-gray-600 mb-2">Últimos {debugEvents.length} eventos.</div>

              <div className="space-y-2 max-h-[260px] overflow-auto">
                {debugEvents.map((e, idx) => (
                  <div key={`${e.at}-${idx}`} className="border rounded-md p-2">
                    <div className="text-gray-500">{e.at}</div>
                    <div className="font-medium">{e.action}</div>
                    {typeof e.detail !== "undefined" ? (
                      <pre className="mt-1 text-[11px] whitespace-pre-wrap break-words text-gray-700">
                        {JSON.stringify(e.detail, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>

              {rawPayload ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Raw payload
                  </summary>
                  <pre className="mt-2 text-[11px] whitespace-pre-wrap break-words text-gray-700 border rounded-md p-2 max-h-[240px] overflow-auto">
                    {JSON.stringify(rawPayload, null, 2)}
                  </pre>
                </details>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* Overlay bloqueo */}
        {isBlocking && (
          <div className="fixed inset-0 z-[9999] bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg px-5 py-4 flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">Cargando…</div>
                <div className="text-gray-600">Procesando datos, por favor espera.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
