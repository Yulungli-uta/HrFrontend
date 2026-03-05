export function getEntityId(x: any): number | null {
  const raw =
    x?.id ??
    x?.contractID ??
    x?.personID ??
    x?.departmentID ??
    x?.jobID ??
    x?.certificationID ??
    x?.contractTypeID ??
    x?.typeID ??
    x?.typeId ??
    x?.valueId ??
    x?.refTypeId;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getEntityLabel(x: any): string {
  const id = getEntityId(x);
  return String(
    x?.fullName ??
      x?.displayName ??
      x?.name ??
      x?.title ??
      x?.description ??
      x?.code ??
      x?.email ??
      (id != null ? `ID ${id}` : "Sin ID")
  );
}
