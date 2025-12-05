// client/src/pages/PersonDetail.tsx

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { usePersonData, usePersonMutations } from "@/hooks/personDetails/usePersonData";

// Componentes de tabs
import { PersonalInfoTab } from "@/components/person-detail/tabs/PersonalInfoTab";
import { PublicationsTab } from "@/components/person-detail/tabs/PublicationsTab";
import { FamilyMembersTab } from "@/components/person-detail/tabs/FamilyMembersTab";
import { WorkExperiencesTab } from "@/components/person-detail/tabs/WorkExperiencesTab";
import { TrainingsTab } from "@/components/person-detail/tabs/TrainingsTab";
import { BooksTab } from "@/components/person-detail/tabs/BooksTab";
import { EmergencyContactsTab } from "@/components/person-detail/tabs/EmergencyContactsTab";

// Componentes de apoyo
import { StatsDashboard } from "@/components/person-detail/StatsDashboard";
import { PersonFormDialog } from "@/components/person-detail/PersonFormDialog";
import { DynamicFormDialog } from "@/components/person-detail/DynamicFormDialog";

import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  RefreshCw,
  User,
  FileText,
  Users,
  Briefcase,
  GraduationCap,
  BookOpen,
  Phone,
} from "lucide-react";

// Tipos para el estado del formulario dinámico
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

export default function PersonDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const personId = Number(id);

  const {
    person,
    isLoading,
    hasError,
    data,
    refetch,
  } = usePersonData(personId);

  const mutations = usePersonMutations(personId);

  // Estado local
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [formState, setFormState] = useState<FormState>({
    type: null,
    item: null,
  });

  // ==========
  // HANDLERS
  // ==========

  const openForm = (type: FormType, item?: unknown) => {
    setFormState({ type, item: item ?? null });
  };

  const closeForm = () => {
    setFormState({ type: null, item: null });
  };

  const handleFormSuccess = () => {
    closeForm();
    refetch();
    toast({
      title: "✅ Éxito",
      description: "Datos guardados correctamente",
    });
  };

  const handleBack = () => {
    navigate("/people");
  };

  const handleRefresh = () => {
    refetch();
  };

  // ==========
  // EFECTOS
  // ==========

  // Notificación de error NO bloqueante
  useEffect(() => {
    if (hasError) {
      toast({
        title: "⚠️ Aviso",
        description:
          "Hubo un problema obteniendo algunos datos relacionados. Puedes seguir editando y agregando información.",
        variant: "destructive",
      });
    }
  }, [hasError, toast]);

  // ==========
  // RENDER CONDICIONAL
  // ==========

  // Loading mientras aún no tengo persona
  if (isLoading && !person) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Persona no encontrada (sólo si definitivamente no hay persona)
  if (!person && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <User className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Persona no encontrada</h2>
          <p className="text-gray-600 mb-4">
            La persona que buscas no existe o no tienes permisos para verla.
          </p>
          <Button onClick={handleBack}>
            Volver al listado
          </Button>
        </div>
      </div>
    );
  }

  // ==========
  // DATOS SEGUROS PARA TABS
  // ==========

  const safeData = {
    publications: data?.publications ?? [],
    familyMembers: data?.familyMembers ?? [],
    workExperiences: data?.workExperiences ?? [],
    trainings: data?.trainings ?? [],
    books: data?.books ?? [],
    emergencyContacts: data?.emergencyContacts ?? [],
    stats: data?.stats ?? null,
  };

  // ==========
  // RENDER PRINCIPAL
  // ==========

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Responsive */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="hidden sm:flex"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="sm:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                {person?.firstName} {person?.lastName}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base truncate">
                CI: {person?.idCard}
              </p>
            </div>
          </div>

          <div className="flex gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Actualizar</span>
              <span className="sm:hidden">Refrescar</span>
            </Button>
            <Button
              onClick={() => setIsEditFormOpen(true)}
              className="bg-uta-blue hover:bg-uta-blue/90 flex-1 sm:flex-none"
            >
              <Edit className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
              <span className="sm:hidden">Editar</span>
            </Button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <StatsDashboard data={safeData} />

        {/* Tabs Responsive */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 sm:space-y-6"
        >
          <TabsList className="w-full grid grid-cols-4 gap-1 h-auto p-1 bg-gray-100 rounded-lg">
            <TabsTrigger
              value="personal"
              className="text-xs px-2 py-2 data-[state=active]:bg-white"
            >
              <User className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger
              value="publications"
              className="text-xs px-2 py-2 data-[state=active]:bg-white"
            >
              <FileText className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Publicaciones</span>
            </TabsTrigger>
            <TabsTrigger
              value="family"
              className="text-xs px-2 py-2 data-[state=active]:bg-white"
            >
              <Users className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Familia</span>
            </TabsTrigger>
            <TabsTrigger
              value="experience"
              className="text-xs px-2 py-2 data-[state=active]:bg-white"
            >
              <Briefcase className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Experiencia</span>
            </TabsTrigger>

            {/* Más tabs en menú desplegable para móviles */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs px-2 py-2 h-auto col-span-4 sm:col-span-1 mt-1 sm:mt-0"
                >
                  <MoreHorizontal className="h-3 w-3 mr-1" />
                  <span>Más</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setActiveTab("trainings")}>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Capacitaciones
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("books")}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Libros
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("emergency")}>
                  <Phone className="h-4 w-4 mr-2" />
                  Contactos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>

          {/* Contenido de Tabs */}
          <TabsContent value="personal" className="space-y-4">
            <PersonalInfoTab
              person={person!}
              onEdit={() => setIsEditFormOpen(true)}
            />
          </TabsContent>

          <TabsContent value="publications" className="space-y-4">
            <PublicationsTab
              publications={safeData.publications}
              onEdit={openForm}
              onDelete={(id) => {
                if (confirm("¿Está seguro de que desea eliminar esta publicación?")) {
                  mutations.publications.delete.mutate(id);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="family" className="space-y-4">
            <FamilyMembersTab
              familyMembers={safeData.familyMembers}
              onEdit={openForm}
              onDelete={(id) => {
                if (confirm("¿Está seguro de que desea eliminar esta carga familiar?")) {
                  mutations.familyMembers.delete.mutate(id);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="experience" className="space-y-4">
            <WorkExperiencesTab
              workExperiences={safeData.workExperiences}
              onEdit={openForm}
              onDelete={(id) => {
                if (
                  confirm(
                    "¿Está seguro de que desea eliminar esta experiencia laboral?"
                  )
                ) {
                  mutations.workExperiences.delete.mutate(id);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="trainings" className="space-y-4">
            <TrainingsTab
              trainings={safeData.trainings}
              onEdit={openForm}
              onDelete={(id) => {
                if (
                  confirm("¿Está seguro de que desea eliminar esta capacitación?")
                ) {
                  mutations.trainings.delete.mutate(id);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="books" className="space-y-4">
            <BooksTab
              books={safeData.books}
              onEdit={openForm}
              onDelete={(id) => {
                if (confirm("¿Está seguro de que desea eliminar este libro?")) {
                  mutations.books.delete.mutate(id);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="emergency" className="space-y-4">
            <EmergencyContactsTab
              emergencyContacts={safeData.emergencyContacts}
              onEdit={openForm}
              onDelete={(id) => {
                if (
                  confirm(
                    "¿Está seguro de que desea eliminar este contacto de emergencia?"
                  )
                ) {
                  mutations.emergencyContacts.delete.mutate(id);
                }
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Diálogos */}
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
      </div>
    </div>
  );
}
