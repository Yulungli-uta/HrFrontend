// src/components/shared/RefTypeDescriptionHint.tsx
import { useRefTypesByCategory } from '@/hooks/useRefTypes';
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
  const shouldFetch = description === undefined && !!category && (typeId != null || !!name);

  const { data: categoryTypes } = useRefTypesByCategory(shouldFetch ? category : null);

  const fetched = shouldFetch
    ? categoryTypes.find((rt: any) =>
        typeId != null ? (rt.typeId ?? rt.typeID) === typeId : rt.name === name
      )?.description || null
    : null;

  const text = description !== undefined ? description : fetched;
  if (!text) return null;

  return <p className={className ?? "text-sm text-muted-foreground mt-1"}>{text}</p>;
}
