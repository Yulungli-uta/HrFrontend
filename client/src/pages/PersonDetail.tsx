import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePersonData, usePersonMutations } from "@/hooks/personDetails/usePersonData";
import {
  TiposReferenciaAPI,
  PaisesAPI,
  ProvinciasAPI,
  CantonesAPI,
} from "@/lib/api";

import { PersonalInfoTab } from "@/components/person-detail/tabs/PersonalInfoTab";
import { PublicationsTab } from "@/components/person-detail/tabs/PublicationsTab";
import { FamilyMembersTab } from "@/components/person-detail/tabs/FamilyMembersTab";
import { WorkExperiencesTab } from "@/components/person-detail/tabs/WorkExperiencesTab";
import { TrainingsTab } from "@/components/person-detail/tabs/TrainingsTab";
import { BooksTab } from "@/components/person-detail/tabs/BooksTab";
import { EmergencyContactsTab } from "@/components/person-detail/tabs/EmergencyContactsTab";

import { StatsDashboard } from "@/components/person-detail/StatsDashboard";
import { PersonFormDialog } from "@/components/person-detail/PersonFormDialog";
import { DynamicFormDialog } from "@/components/person-detail/DynamicFormDialog";
import { ConfirmDeleteDialog } from "@/components/person-detail/ConfirmDeleteDialog";

import {
  ArrowLeft,
  Edit,
  RefreshCw,
  User,
  FileText,
  Users,
  Briefcase,
  GraduationCap,
  BookOpen,
  Phone,
} from "lucide-react";

type FormType =
  | "publication"
  | "familyMember"
  | "workExperience"
  | "training"
  | "book"
  | "emergencyContact"
  | null;

interface FormState {
  type: FormType;
  item: unknown | null;
}

interface ApiRefType {
  typeId?: number;
  typeID?: number;
  category: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

interface RefType {
  id: number;
  category: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

interface DeleteConfirmState {
  open: boolean;
  description: string;
  action: (() => void) | null;
}

const REF_CATEGORIES = [
  "IDENTITY_TYPE",
  "MARITAL_STATUS",
  "ETHNICITY",
  "BLOOD_TYPE",
  "SPECIAL_NEEDS",
  "GENDER_TYPE",
  "SEX_TYPE",
];

function buildNameMap(items: any[], idKeys: string[], nameKeys: string[]) {
  const map: Record<number, string> = {};
  items.forEach((item) => {
    const rawId = idKeys
      .map((k) => item?.[k])
      .find((v) => v !== undefined && v !== null);
    const rawName = nameKeys
      .map((k) => item?.[k])
      .find((v) => typeof v === "string" && v.trim());
    const id = Number(rawId);
    if (!Number.isNaN(id) && rawName) map[id] = rawName;
  });
  return map;
}

export default function PersonDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, employeeDetails } = useAuth();

  const hasPeoplePermission = user?.permissions?.some((p) => p === "/people") ?? false;
  const urlId = id ? Number(id) : null;

  // Administrador (tiene /people): usa el ID de la URL.
  // Empleado regular o ruta /perfil sin parámetro: usa el personId del contexto de autenticación.
  const personId = (hasPeoplePermission && urlId && !isNaN(urlId))
    ? urlId
    : (employeeDetails?.personId ?? 0);

  // No disparar APIs hasta tener el personId resuelto
  const fetchEnabled = personId > 0;

  const { person, isLoading, hasError, data, refetch } = usePersonData(personId, { enabled: fetchEnabled });
  const mutations = usePersonMutations(personId);

  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [formState, setFormState] = useState<FormState>({ type: null, item: null });
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    description: "",
    action: null,
  });

  // ── Lookups remotos ──────────────────────────────────────────────────────────

  const { data: refTypesResponse } = useQuery({
    queryKey: ["person-detail-ref-types"],
    queryFn: () => TiposReferenciaAPI.list(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: countriesResponse } = useQuery({
    queryKey: ["countries"],
    queryFn: () => PaisesAPI.list(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: provincesResponse } = useQuery({
    queryKey: ["provinces"],
    queryFn: () => ProvinciasAPI.list(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: cantonsResponse } = useQuery({
    queryKey: ["cantons"],
    queryFn: () => CantonesAPI.list(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // ── Mapas derivados ──────────────────────────────────────────────────────────

  /**
   * Mapa global id → nombre que cubre TODOS los ref_types del API.
   * Los tabs reciben este mapa (DIP) en lugar de llamar al API directamente.
   */
  const allRefTypesById = useMemo<Record<number, string>>(() => {
    if (refTypesResponse?.status !== "success" || !Array.isArray(refTypesResponse.data)) {
      return {};
    }
    const map: Record<number, string> = {};
    (refTypesResponse.data as ApiRefType[]).forEach((ref) => {
      const id = Number(ref.typeId ?? ref.typeID ?? 0);
      if (id > 0) map[id] = ref.name;
    });
    return map;
  }, [refTypesResponse]);

  /** Subconjunto filtrado por categoría, para PersonalInfoTab que lo necesita así */
  const refTypesByCategory = useMemo(() => {
    if (refTypesResponse?.status !== "success" || !Array.isArray(refTypesResponse.data)) {
      return {} as Record<string, RefType[]>;
    }
    return (refTypesResponse.data as ApiRefType[]).reduce(
      (acc: Record<string, RefType[]>, ref) => {
        if (!REF_CATEGORIES.includes(ref.category)) return acc;
        const normalized: RefType = {
          id: Number(ref.typeId ?? ref.typeID ?? 0),
          category: ref.category,
          name: ref.name,
          description: ref.description ?? undefined,
          isActive: ref.isActive,
        };
        if (!acc[ref.category]) acc[ref.category] = [];
        acc[ref.category].push(normalized);
        return acc;
      },
      {}
    );
  }, [refTypesResponse]);

  const countryMap = useMemo(() => {
    if (countriesResponse?.status === "success" && Array.isArray(countriesResponse.data)) {
      return buildNameMap(countriesResponse.data, ["countryId", "id"], ["name", "countryName"]);
    }
    return {};
  }, [countriesResponse]);

  const provinceMap = useMemo(() => {
    if (provincesResponse?.status === "success" && Array.isArray(provincesResponse.data)) {
      return buildNameMap(provincesResponse.data, ["provinceId", "id"], ["name", "provinceName"]);
    }
    return {};
  }, [provincesResponse]);

  const cantonMap = useMemo(() => {
    if (cantonsResponse?.status === "success" && Array.isArray(cantonsResponse.data)) {
      return buildNameMap(cantonsResponse.data, ["cantonId", "id"], ["name", "cantonName"]);
    }
    return {};
  }, [cantonsResponse]);

  // ── Confirmación de eliminación ──────────────────────────────────────────────

  const confirmDelete = (description: string, action: () => void) => {
    setDeleteConfirm({ open: true, description, action });
  };

  const handleDeleteConfirm = () => {
    deleteConfirm.action?.();
    setDeleteConfirm({ open: false, description: "", action: null });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ open: false, description: "", action: null });
  };

  // ── Formularios ──────────────────────────────────────────────────────────────

  const openForm = (type: FormType, item?: unknown) => {
    setFormState({ type, item: item ?? null });
  };

  const closeForm = () => setFormState({ type: null, item: null });

  const handleFormSuccess = () => {
    closeForm();
    refetch();
    toast({ title: "✅ Éxito", description: "Datos guardados correctamente" });
  };

  // ── Errores y carga ──────────────────────────────────────────────────────────

  // Mientras el personId del contexto todavía no está disponible, mostrar spinner
  if (personId === 0 && !fetchEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (hasError && !person) {
    toast({
      title: "⚠️ Aviso",
      description:
        "Hubo un problema obteniendo algunos datos relacionados. Puedes seguir editando y agregando información.",
      variant: "destructive",
    });
  }

  if (isLoading && !person) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!person && !isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <User className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Persona no encontrada</h2>
          <p className="text-muted-foreground mb-4">
            La persona que buscas no existe o no tienes permisos para verla.
          </p>
          <Button onClick={() => navigate("/people")}>Volver al listado</Button>
        </div>
      </div>
    );
  }

  const safeData = {
    publications:      data?.publications      ?? [],
    familyMembers:     data?.familyMembers      ?? [],
    workExperiences:   data?.workExperiences    ?? [],
    trainings:         data?.trainings          ?? [],
    books:             data?.books              ?? [],
    emergencyContacts: data?.emergencyContacts  ?? [],
    stats:             (data as any)?.stats     ?? null,
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ── Cabecera ── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/people")}
              className="hidden sm:flex"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/people")}
              className="sm:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                {person?.firstName} {person?.lastName}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base truncate">
                CI: {person?.idCard}
              </p>
            </div>
          </div>

          <div className="flex gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Actualizar</span>
              <span className="sm:hidden">Refrescar</span>
            </Button>
            <Button
              onClick={() => setIsEditFormOpen(true)}
              className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </div>
        </div>

        <StatsDashboard data={safeData} />

        {/* ── Tabs — todos visibles, scroll horizontal en mobile ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto pb-0.5">
            <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg gap-0.5 min-w-max w-full sm:w-auto">
              {([
                { value: "personal",     icon: User,          label: "Personal"       },
                { value: "publications", icon: FileText,      label: "Publicaciones"  },
                { value: "family",       icon: Users,         label: "Familia"        },
                { value: "experience",   icon: Briefcase,     label: "Experiencia"    },
                { value: "trainings",    icon: GraduationCap, label: "Capacitaciones" },
                { value: "books",        icon: BookOpen,      label: "Libros"         },
                { value: "emergency",    icon: Phone,         label: "Contactos"      },
              ] as const).map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="shrink-0 text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-card flex items-center gap-1"
                >
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  <span className="hidden xs:inline sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="personal" className="space-y-4">
            <PersonalInfoTab
              person={person!}
              onEdit={() => setIsEditFormOpen(true)}
              refTypesByCategory={refTypesByCategory}
              refTypesMap={allRefTypesById}
              countryMap={countryMap}
              provinceMap={provinceMap}
              cantonMap={cantonMap}
            />
          </TabsContent>

          <TabsContent value="publications" className="space-y-4">
            <PublicationsTab
              publications={safeData.publications}
              onEdit={openForm as any}
              onDelete={(id) =>
                confirmDelete(
                  "¿Está seguro de que desea eliminar esta publicación?",
                  () => mutations.publications.delete.mutate(id)
                )
              }
            />
          </TabsContent>

          <TabsContent value="family" className="space-y-4">
            <FamilyMembersTab
              familyMembers={safeData.familyMembers}
              onEdit={openForm as any}
              onDelete={(id) =>
                confirmDelete(
                  "¿Está seguro de que desea eliminar esta carga familiar?",
                  () => mutations.familyMembers.delete.mutate(id)
                )
              }
              refTypesMap={allRefTypesById}
            />
          </TabsContent>

          <TabsContent value="experience" className="space-y-4">
            <WorkExperiencesTab
              workExperiences={safeData.workExperiences}
              onEdit={openForm as any}
              onDelete={(id) =>
                confirmDelete(
                  "¿Está seguro de que desea eliminar esta experiencia laboral?",
                  () => mutations.workExperiences.delete.mutate(id)
                )
              }
              refTypesMap={allRefTypesById}
              countryMap={countryMap}
            />
          </TabsContent>

          <TabsContent value="trainings" className="space-y-4">
            <TrainingsTab
              trainings={safeData.trainings}
              onEdit={openForm as any}
              onDelete={(id) =>
                confirmDelete(
                  "¿Está seguro de que desea eliminar esta capacitación?",
                  () => mutations.trainings.delete.mutate(id)
                )
              }
              refTypesMap={allRefTypesById}
            />
          </TabsContent>

          <TabsContent value="books" className="space-y-4">
            <BooksTab
              books={safeData.books}
              onEdit={openForm as any}
              onDelete={(id) =>
                confirmDelete(
                  "¿Está seguro de que desea eliminar este libro?",
                  () => mutations.books.delete.mutate(id)
                )
              }
              countryMap={countryMap}
            />
          </TabsContent>

          <TabsContent value="emergency" className="space-y-4">
            <EmergencyContactsTab
              emergencyContacts={safeData.emergencyContacts}
              onEdit={openForm as any}
              onDelete={(id) =>
                confirmDelete(
                  "¿Está seguro de que desea eliminar este contacto de emergencia?",
                  () => mutations.emergencyContacts.delete.mutate(id)
                )
              }
              refTypesMap={allRefTypesById}
            />
          </TabsContent>
        </Tabs>

        {/* ── Dialogs ── */}
        <PersonFormDialog
          open={isEditFormOpen}
          onOpenChange={setIsEditFormOpen}
          person={person!}
          onSuccess={() => {
            setIsEditFormOpen(false);
            refetch();
          }}
        />

        <DynamicFormDialog
          formState={formState}
          onClose={closeForm}
          onSuccess={handleFormSuccess}
          personId={personId}
          mutations={mutations}
        />

        <ConfirmDeleteDialog
          open={deleteConfirm.open}
          description={deleteConfirm.description}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      </div>
    </div>
  );
}
