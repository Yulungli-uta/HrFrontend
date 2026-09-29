// client/src/components/person-detail/DynamicFormDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { trimDeep } from "@/lib/textNormalize";

interface DynamicFormDialogProps {
  formState: { type: string | null; item: any | null };
  onClose: () => void;
  onSuccess: () => void;
  personId: number;
  mutations: any;
  /** Datos ya cargados de la persona (safeData), para validaciones que necesitan ver la lista completa. */
  allData?: Record<string, any[]>;
  /** Fecha de nacimiento del titular (Person.birthDate) — hallazgo informe UTA-DITIC-PS-027-2026,
   * observación 23: valida que un/a hijo/a no tenga fecha de nacimiento anterior a la del padre/madre. */
  personBirthDate?: string | null;
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
  personBirthDate,
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
      // Hallazgo en vivo 2026-09-28 (observación 26 del informe UTA-DITIC-PS-027-2026,
      // "botón Actualizar no funciona" en Contactos): el campo real es contactId
      // (EmergencyContactsDto.ContactId → camelCase), nunca emergencyContactId — getItemId
      // devolvía undefined y el submit fallaba en silencio, sin toast de error, porque el
      // throw ocurre antes de llegar a la mutación (donde vive el onError con el toast).
      emergency: "contactId",
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

  const handleSubmit = async (rawData: any) => {
    // Normaliza espacios en blanco (inicio/fin/múltiples) en todos los campos de texto antes
    // de enviar — hallazgo informe UTA-DITIC-PS-027-2026, observación 2. No aplica a los
    // formularios que arman su propio FormData (camino "crear con documento adjunto"), esos
    // siguen su propio flujo fuera de este componente.
    const data = trimDeep(rawData);
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
      // Hallazgo en vivo (2026-09-28, botones "Actualizar" de Experiencia Laboral y
      // Contactos que "no hacían nada"): este catch tragaba el error sin relanzarlo, así que
      // el `await onSubmit(payload)` de CADA formulario individual (WorkExperienceForm,
      // EmergencyContactForm, etc.) nunca veía el rechazo — su propio try/catch, que existe
      // justamente para NO ejecutar form.reset() cuando falla el guardado, corría igual que
      // si hubiera tenido éxito. El toast de error sí aparecía (mutación → onError), pero el
      // formulario se vaciaba solo, borrando lo que el usuario había escrito. Se relanza para
      // que el try/catch de cada formulario funcione como está diseñado.
      throw error;
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
    type === "emergency"
      ? { existingContacts: allData?.emergencyContacts ?? [] }
      : type === "address"
      ? { existingAddresses: allData?.addresses ?? [] }
      : type === "family"
      ? { personBirthDate }
      : {};

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
            <DialogDescription>
              {isEditing
                ? `Modifica los datos de este registro de ${formTitles[type as keyof typeof formTitles]}.`
                : `Completa los datos para registrar ${formTitles[type as keyof typeof formTitles]}.`}
            </DialogDescription>
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
