// src/components/person-detail/PersonAvatarPreview.tsx
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { DocumentsAPI } from "@/lib/api";
import { PERSON_PHOTO_DIRECTORY_CODE, PERSON_PHOTO_ENTITY_TYPE } from "@/features/constants";

interface PersonAvatarPreviewProps {
  personId: number;
}

/**
 * Miniatura circular de la fotografía de perfil de la persona (si existe), para mostrar
 * junto al nombre/CI en el encabezado. Componente propio y pequeño — no se metió esta
 * lógica en ReusableDocumentManager (compartido por muchos módulos sin relación).
 */
export function PersonAvatarPreview({ personId }: PersonAvatarPreviewProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["person-photo", personId],
    queryFn: () =>
      DocumentsAPI.listByEntity({
        directoryCode: PERSON_PHOTO_DIRECTORY_CODE,
        entityType: PERSON_PHOTO_ENTITY_TYPE,
        entityId: personId,
        status: 1,
      }),
    enabled: !!personId,
    staleTime: 60 * 1000,
  });

  const fileGuid = data?.status === "success" ? data.data?.[0]?.fileGuid : undefined;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    if (fileGuid) {
      DocumentsAPI.download(fileGuid).then((resp) => {
        if (cancelled) return;
        if (resp.status === "success") {
          objectUrl = window.URL.createObjectURL(resp.data);
          setImgUrl(objectUrl);
        }
      });
    } else {
      setImgUrl(null);
    }

    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [fileGuid]);

  return (
    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden border bg-muted flex items-center justify-center shrink-0">
      {imgUrl ? (
        <img src={imgUrl} alt="Fotografía de perfil" className="h-full w-full object-cover" />
      ) : (
        <User className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
      )}
    </div>
  );
}
