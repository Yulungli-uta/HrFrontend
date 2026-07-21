// src/components/shared/RefTypeDescriptionHint.tsx
import { useEffect, useState } from 'react';
import { TiposReferenciaAPI } from '@/lib/api';
import type { RefTypeCategory } from '@/features/refTypeCategories';

/**
 * Texto de ayuda que muestra la Description (HR.ref_Types) de un valor
 * seleccionado, debajo del control (Select/SearchableSelect/etc.) que lo eligió.
 * Reutilizable en cualquier pantalla que use un catálogo ref_Types cuyo Name
 * (en inglés) no sea autoexplicativo.
 *
 * Dos modos:
 * - Si ya se conoce la descripción (viene incluida en el DTO consumido, como
 *   AccessibleModuleDto.moduleTypeDescription), pasarla directo por `description`
 *   evita una llamada de red redundante.
 * - Si no se tiene, pasar `category` + (`typeId` o `name`) y el componente la
 *   busca vía TiposReferenciaAPI.byCategory.
 */
type Props = {
  description?: string | null;
  category?: RefTypeCategory;
  typeId?: number | null;
  name?: string | null;
  className?: string;
};

export function RefTypeDescriptionHint({ description, category, typeId, name, className }: Props) {
  const [fetched, setFetched] = useState<string | null>(null);
  const shouldFetch = description === undefined && !!category && (typeId != null || !!name);

  useEffect(() => {
    if (!shouldFetch) {
      setFetched(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await TiposReferenciaAPI.byCategory(category!);
      if (cancelled || res.status !== 'success') return;
      const match = (res.data ?? []).find((rt: any) =>
        typeId != null ? (rt.typeId ?? rt.typeID) === typeId : rt.name === name
      );
      setFetched(match?.description || null);
    })();
    return () => { cancelled = true; };
  }, [shouldFetch, category, typeId, name]);

  const text = description !== undefined ? description : fetched;
  if (!text) return null;

  return <p className={className ?? "text-sm text-muted-foreground mt-1"}>{text}</p>;
}
