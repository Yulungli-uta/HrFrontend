// client/src/components/person-detail/DynamicFormDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PublicationForm from "@/components/person-detail/forms/PublicationForm";
import FamilyMemberForm from "@/components/person-detail/forms/FamilyMemberForm";
import WorkExperienceForm from "@/components/person-detail/forms/WorkExperienceForm";
import TrainingForm from "@/components/person-detail/forms/TrainingForm";
import BookForm from "@/components/person-detail/forms/BookForm";
import EmergencyContactForm from "@/components/person-detail/forms/EmergencyContactForm";

interface DynamicFormDialogProps {
  formState: { type: string | null; item: any | null };
  onClose: () => void;
  onSuccess: () => void;
  personId: number;
  mutations: any;
}

// Mapeo de tipos de formulario a claves de mutaciones
const formTypeToMutationKey = {
  publication: "publications",
  family: "familyMembers",
  experience: "workExperiences",
  training: "trainings",
  book: "books",
  emergency: "emergencyContacts",
} as const;

const formComponents = {
  publication: PublicationForm,
  family: FamilyMemberForm,
  experience: WorkExperienceForm,
  training: TrainingForm,
  book: BookForm,
  emergency: EmergencyContactForm,
};

const formTitles = {
  publication: "Publicación",
  family: "Carga Familiar",
  experience: "Experiencia Laboral",
  training: "Capacitación",
  book: "Libro",
  emergency: "Contacto de Emergencia",
};

// Mapeo de tipos de formulario a nombre de prop esperado en cada formulario
const formTypeToPropName = {
  publication: "publication",        // PublicationForm: publication?: Publication
  family: "familyMember",            // FamilyMemberForm: familyMember?: FamilyMember
  experience: "workExperience",      // WorkExperienceForm: workExperience?: WorkExperience
  training: "training",              // (ya funcionaba así)
  book: "book",                      // (ya funcionaba así)
  emergency: "emergencyContact",     // EmergencyContactForm: emergencyContact?: EmergencyContact
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
}: DynamicFormDialogProps) {
  // console.log("[DynamicFormDialog] RENDER", {
  //   formState,
  //   personId,
  //   hasMutations: !!mutations,
  // });

  if (!formState.type) {
    // console.log("[DynamicFormDialog] sin tipo de formulario, no se muestra diálogo", {
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

  // console.log("[DynamicFormDialog] resolved config", {
  //   type,
  //   mutationKey,
  //   isEditing,
  //   item,
  //   mutationsForType: mutations?.[mutationKey],
  // });

  // Verificar que las mutaciones existen
  if (!mutations || !mutations[mutationKey]) {
    // console.error(`[DynamicFormDialog] Mutaciones no encontradas para: ${mutationKey}`, {
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
      book: "bookId",
      emergency: "emergencyContactId",
    };

    const idField = idMap[type];
    const id = item?.[idField] || item?.id;

    // console.log("[DynamicFormDialog] getItemId", {
    //   type,
    //   idField,
    //   item,
    //   resolvedId: id,
    // });

    return id;
  };

  const handleSubmit = async (data: any) => {
    // console.log("[DynamicFormDialog] handleSubmit called", {
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
          console.error("[DynamicFormDialog] handleSubmit sin ID para editar", {
            type,
            item,
            data,
          });
          throw new Error(
            `No se pudo obtener el ID del elemento para editar`
          );
        }

        // console.log("[DynamicFormDialog] UPDATE mutation", {
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
        console.log("[DynamicFormDialog] CREATE mutation", {
          type,
          mutationKey,
          data,
        });

        await mutations[mutationKey].create.mutateAsync(data);
      }

      // console.log("[DynamicFormDialog] handleSubmit SUCCESS", { type, mutationKey });
      onSuccess();
    } catch (error) {
      console.error(
        `[DynamicFormDialog] Error en formulario ${type}:`,
        error
      );
      // El error ya se maneja en la mutación, no necesitamos hacer nada más aquí
    }
  };

  const isLoading =
    mutations[mutationKey]?.create?.isPending ||
    mutations[mutationKey]?.update?.isPending ||
    false;

  // console.log("[DynamicFormDialog] isLoading state", {
  //   type,
  //   mutationKey,
  //   isLoading,
  // });

  const formProps = {
    personId,
    ...(isEditing && propName ? { [propName]: item } : {}),
    onSubmit: handleSubmit,
    onCancel: onClose,
    isLoading,
  };

  return (
    <Dialog open={!!formState.type} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing
              ? `Editar ${
                  formTitles[type as keyof typeof formTitles]
                }`
              : `Nueva ${
                  formTitles[type as keyof typeof formTitles]
                }`}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <FormComponent {...formProps} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
