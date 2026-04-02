// client/src/components/person-detail/PersonFormDialog.tsx
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PersonForm from "@/components/forms/PersonForm";
import { TiposReferenciaAPI, PersonasAPI, type ApiResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PersonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: any;
  onSuccess: () => void;
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

const REF_CATEGORIES = [
  "IDENTITY_TYPE",
  "MARITAL_STATUS",
  "ETHNICITY",
  "BLOOD_TYPE",
  "SPECIAL_NEEDS",
  "GENDER_TYPE",
  "SEX_TYPE",
];

export function PersonFormDialog({ open, onOpenChange, person, onSuccess }: PersonFormDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: refTypesResponse,
    isLoading: isLoadingRefTypes,
    isError: isErrorRefTypes,
  } = useQuery<ApiResponse<ApiRefType[]>>({
    queryKey: ["person-detail-dialog-refTypes"],
    queryFn: () => TiposReferenciaAPI.list(),
    enabled: open,
  });

  const refTypesByCategory = useMemo(() => {
    if (
      refTypesResponse?.status === "success" &&
      Array.isArray(refTypesResponse.data)
    ) {
      return refTypesResponse.data.reduce((acc, ref) => {
        if (!REF_CATEGORIES.includes(ref.category)) {
          return acc;
        }

        const normalized: RefType = {
          id: Number(ref.typeId ?? ref.typeID ?? 0),
          category: ref.category,
          name: ref.name,
          description: ref.description ?? undefined,
          isActive: ref.isActive,
        };

        if (!acc[ref.category]) {
          acc[ref.category] = [];
        }

        acc[ref.category].push(normalized);
        return acc;
      }, {} as Record<string, RefType[]>);
    }

    return {} as Record<string, RefType[]>;
  }, [refTypesResponse]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const personId =
        person?.personId ??
        person?.id ??
        person?.PersonId ??
        null;

      if (personId != null) {
        const response = await PersonasAPI.update(personId, data);
        if (response.status === "error") {
          throw new Error(response.error.message);
        }
        return response.data;
      }

      const response = await PersonasAPI.create(data);
      if (response.status === "error") {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/people"] });
      toast({
        title: "Información actualizada",
        description: "Los datos personales se guardaron correctamente.",
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Modificar Información Personal
          </DialogTitle>
        </DialogHeader>

        <PersonForm
          person={person}
          onSubmit={(data) => saveMutation.mutate(data)}
          onCancel={() => onOpenChange(false)}
          isLoading={saveMutation.isPending || isLoadingRefTypes}
          refTypesByCategory={refTypesByCategory}
          isRefTypesError={isErrorRefTypes}
        />
      </DialogContent>
    </Dialog>
  );
}