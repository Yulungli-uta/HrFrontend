// client/src/components/person-detail/DynamicFormDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import PublicationForm from "@/components/person-detail/forms/PublicationForm";
import FamilyMemberForm from "@/components/person-detail/forms/FamilyMemberForm";
import WorkExperienceForm from "@/components/person-detail/forms/WorkExperienceForm";
import TrainingForm from "@/components/person-detail/forms/TrainingForm";
import LanguageForm from "@/components/person-detail/forms/LanguageForm";
import BookForm from "@/components/person-detail/forms/BookForm";
import EmergencyContactForm from "@/components/person-detail/forms/EmergencyContactForm";
import CatastrophicIllnessForm from "@/components/person-detail/forms/CatastrophicIllnessForm";
import EducationLevelForm from "@/components/person-detail/forms/EducationLevelForm";
import AddressForm from "@/components/person-detail/forms/AddressForm";
import BankAccountForm from "@/components/person-detail/forms/BankAccountForm";
import { logger } from "@/lib/logger";

interface DynamicFormDialogProps {
  formState: { type: string | null; item: any | null };
  onClose: () => void;
  onSuccess: () => void;
  personId: number;
  mutations: any;
  /** Datos ya cargados de la persona (safeData), para validaciones que necesitan ver la lista completa. */
  allData?: Record<string, any[]>;
}

// Mapeo de tipos de formulario a claves de mutaciones
const formTypeToMutationKey = {
  publication: "publications",
  family: "familyMembers",
  experience: "workExperiences",
  training: "trainings",
  language: "languages",
  book: "books",
  emergency: "emergencyContacts",
  catastrophicIllness: "catastrophicIllnesses",
  educationLevel: "educationLevels",
  address: "addresses",
  bankAccount: "bankAccounts",
} as const;

const formComponents = {
  publication: PublicationForm,
  family: FamilyMemberForm,
  experience: WorkExperienceForm,
  training: TrainingForm,
  language: LanguageForm,
  book: BookForm,
  emergency: EmergencyContactForm,
  catastrophicIllness: CatastrophicIllnessForm,
  educationLevel: EducationLevelForm,
  address: AddressForm,
  bankAccount: BankAccountForm,
};

const formTitles = {
  publication: "Publicación",
  family: "Carga Familiar",
  experience: "Experiencia Laboral",
  training: "Capacitación",
  language: "Idioma",
  book: "Libro",
  emergency: "Contacto de Emergencia",
  catastrophicIllness: "Enfermedad Catastrófica",
  educationLevel: "Formación Académica",
  address: "Dirección",
  bankAccount: "Cuenta Bancaria",
};

// Mapeo de tipos de formulario a nombre de prop esperado en cada formulario
const formTypeToPropName = {
  publication: "publication",        // PublicationForm: publication?: Publication
  family: "familyMember",            // FamilyMemberForm: familyMember?: FamilyMember
  experience: "workExperience",      // WorkExperienceForm: workExperience?: WorkExperience
  training: "training",              // (ya funcionaba así)
  language: "language",              // LanguageForm: language?: Language
  book: "book",                      // (ya funcionaba así)
  emergency: "emergencyContact",     // EmergencyContactForm: emergencyContact?: EmergencyContact
  catastrophicIllness: "catastrophicIllness", // CatastrophicIllnessForm: catastrophicIllness?: CatastrophicIllness
  educationLevel: "educationLevel",  // EducationLevelForm: educationLevel?: EducationLevel
  address: "address",                // AddressForm: address?: Address
  bankAccount: "bankAccount",        // BankAccountForm: bankAccount?: BankAccount
} as const;

// const formTypeToPropName = {
//   publication: "publication",
//   family: "FamilyMember",
//   experience: "WorkExperience",
//   training: "training",
//   book: "book",
//   emergency: "emergencyContact", // 👈 aquí el caso especial
// } as const;

export function DynamicFormDialog({
  formState,
  onClose,
  onSuccess,
  personId,
  mutations,
  allData,
}: DynamicFormDialogProps) {
  const { setIsFormDirty, handleOpenChange, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard((open) => { if (!open) onClose(); });
  // logger.debug("DynamicFormDialog", "[DynamicFormDialog] RENDER", {
  //   formState,
  //   personId,
  //   hasMutations: !!mutations,
  // });

  if (!formState.type) {
    // logger.debug("DynamicFormDialog", "[DynamicFormDialog] sin tipo de formulario, no se muestra diálogo", {
    //   formState,
    // });
    return null;
  }

  const { type, item } = formState;
  const FormComponent = formComponents[type as keyof typeof formComponents];
  const mutationKey =
    formTypeToMutationKey[type as keyof typeof formTypeToMutationKey];
  const isEditing = !!item;
  const propName =
    (formTypeToPropName as any)[
      type as keyof typeof formTypeToPropName
    ];

  // logger.debug("DynamicFormDialog", "[DynamicFormDialog] resolved config", {
  //   type,
  //   mutationKey,
  //   isEditing,
  //   item,
  //   mutationsForType: mutations?.[mutationKey],
  // });

  // Verificar que las mutaciones existen
  if (!mutations || !mutations[mutationKey]) {
    // logger.error("DynamicFormDialog", `[DynamicFormDialog] Mutaciones no encontradas para: ${mutationKey}`, {
    //   type,
    //   mutationKey,
    //   mutations,
    // });
    return null;
  }

  // Helper para obtener el ID correcto basado en el tipo
  const getItemId = (item: any, type: string) => {
    const idMap: { [key: string]: string } = {
      publication: "publicationId",
      family: "burdenId",
      experience: "workExpId",
      training: "trainingId",
      language: "languageId",
      book: "bookId",
      emergency: "emergencyContactId",
      catastrophicIllness: "illnessId",
      educationLevel: "educationId",
      address: "addressId",
      bankAccount: "accountId",
    };

    const idField = idMap[type];
    const id = item?.[idField] || item?.id;

    // logger.debug("DynamicFormDialog", "[DynamicFormDialog] getItemId", {
    //   type,
    //   idField,
    //   item,
    //   resolvedId: id,
    // });

    return id;
  };

  const handleSubmit = async (data: any) => {
    // logger.debug("DynamicFormDialog", "[DynamicFormDialog] handleSubmit called", {
    //   type,
    //   isEditing,
    //   item,
    //   data,
    //   mutationKey,
    // });

    try {
      if (isEditing) {
        // Obtener el ID correcto basado en el tipo
        const id = getItemId(item, type);
        if (!id) {
          logger.error("DynamicFormDialog", "[DynamicFormDialog] handleSubmit sin ID para editar", {
            type,
            item,
            data,
          });
          throw new Error(
            `No se pudo obtener el ID del elemento para editar`
          );
        }

        // logger.debug("DynamicFormDialog", "[DynamicFormDialog] UPDATE mutation", {
        //   type,
        //   mutationKey,
        //   id,
        //   data,
        // });

        await mutations[mutationKey].update.mutateAsync({
          id,
          data,
        });
      } else {
        logger.debug("DynamicFormDialog", "[DynamicFormDialog] CREATE mutation", {
          type,
          mutationKey,
          data,
        });

        await mutations[mutationKey].create.mutateAsync(data);
      }

      onSuccess();
    } catch (error) {
      logger.error("DynamicFormDialog", `[DynamicFormDialog] Error en formulario ${type}:`,
        error
      );
      // El error ya se maneja en la mutación, no necesitamos hacer nada más aquí
    }
  };

  const isLoading =
    mutations[mutationKey]?.create?.isPending ||
    mutations[mutationKey]?.update?.isPending ||
    false;

  // logger.debug("DynamicFormDialog", "[DynamicFormDialog] isLoading state", {
  //   type,
  //   mutationKey,
  //   isLoading,
  // });

  const extraListProps: Record<string, any> =
    type === "emergency" ? { existingContacts: allData?.emergencyContacts ?? [] } : {};

  const formProps = {
    personId,
    ...(isEditing && propName ? { [propName]: item } : {}),
    ...extraListProps,
    onSubmit: handleSubmit,
    onCancel: () => handleOpenChange(false),
    isLoading,
    onDirtyChange: setIsFormDirty,
    // Para formularios que hacen su propia mutación fuera del flujo genérico
    // (ej. crear-con-documento adjunto en una sola llamada transaccional).
    closeAndRefresh: () => onSuccess(),
  };

  return (
    <>
      <Dialog open={!!formState.type} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {isEditing
                ? `Editar ${formTitles[type as keyof typeof formTitles]}`
                : `Nueva ${formTitles[type as keyof typeof formTitles]}`}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <FormComponent {...formProps} />
          </div>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={confirmOpen}
        onClose={closeConfirm}
        onConfirmExit={confirmExit}
      />
    </>
  );
}
