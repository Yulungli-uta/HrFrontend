// =============================================================================
// Interfaz Person
// =============================================================================

export interface Person {
  /** ID interno del registro (alias de personId en algunos contextos). */
  id: number;
  /**
   * ID real de la persona en el backend (PersonId en PeopleDto.cs).
   * CORRECCIÓN: añadido para resolver TS2339 en People.tsx y ContractDialog.tsx.
   */
  personId: number;
  firstName: string;
  lastName: string;
  /**
   * Tipo de identificación (cédula, pasaporte, etc.).
   * CORRECCIÓN: añadido para resolver TS2339 en PersonForm.tsx.
   */
  identType?: number;
  idCard: string;
  email: string;
  phone?: string | null;
  birthDate?: string | null;
  sex?: string | number | null;
  gender?: string | number | null;
  maritalStatusTypeId?: number | null;
  ethnicityTypeId?: number | null;
  countryId?: number | string | null;
  provinceId?: number | string | null;
  cantonId?: number | string | null;
  address?: string | null;
  disability?: string | null;
  isActive: boolean;
  motherName?: string | null;
  fatherName?: string | null;
  bloodTypeTypeId?: number | null;
  specialNeedsTypeId?: number | null;
  disabilityPercentage?: number | null;
  conadisCard?: string | null;
  yearsOfResidence?: number | null;
  militaryCard?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// =============================================================================
// Interfaces de CV
// =============================================================================

export interface Publication {
  publicationId: number;
  personId: number;
  title: string;
  journalName?: string;
  journalNumber?: string;
  volume?: string;
  pages?: string;
  issn_Isbn?: string;
  location?: string;
  publicationTypeId?: number;
  journalTypeId?: number;
  isIndexed?: boolean;
  knowledgeAreaTypeId?: number;
  subAreaTypeId?: number;
  areaTypeId?: number;
  organizedBy?: string;
  eventName?: string;
  eventEdition?: string;
  publicationDate?: string;
  utAffiliation?: boolean;
  notes?: string;
  publicationTypeName?: string;
  journalTypeName?: string;
}

export interface FamilyMember {
  burdenId: number;
  personId: number;
  firstName: string;
  lastName: string;
  dependentId: string;
  identificationTypeId: number;
  birthDate: string;
  relationship: string;
  disabilityTypeId?: number;
  disabilityPercentage?: number;
  hasDisability?: boolean;
  isStudying?: boolean;
  educationInstitution?: string;
}

export interface WorkExperience {
  workExpId: number;
  personId: number;
  countryId: string;
  company: string;
  institutionTypeId: number;
  entryReason: string;
  exitReason?: string | null;
  position: string;
  institutionAddress?: string | null;
  startDate: string;
  endDate?: string | null;
  experienceTypeId: number;
  isCurrent: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Training {
  trainingId: number;
  personId: number;
  title: string;
  institution: string;
  location?: string;
  knowledgeAreaTypeId?: number;
  eventTypeId: number;
  certifiedBy?: string;
  certificateTypeId?: number;
  startDate: string;
  endDate?: string;
  hours?: number;
  approvalTypeId?: number;
  createdAt?: string;
}

export interface Book {
  bookId: number;
  personId: number;
  title: string;
  publisher?: string;
  isbn?: string;
  publicationDate?: string;
  peerReviewed?: boolean;
  countryId?: string;
  city?: string;
  knowledgeAreaTypeId?: number;
  subAreaTypeId?: number;
  areaTypeId?: number;
  volumeCount?: number;
  participationTypeId?: number;
  bookTypeId?: number;
  utAffiliation?: boolean;
  utaSponsorship?: boolean;
  createdAt?: string;
  coAuthors?: string;
  category?: string;
  description?: string;
}

export interface EmergencyContact {
  contactId: number;
  personId: number;
  identification: string;
  firstName: string;
  lastName: string;
  relationshipTypeId: number;
  address: string | null;
  phone: string;
  mobile: string | null;
  createdAt: string;
}

// =============================================================================
// Helpers de normalización
// =============================================================================

/**
 * Normaliza datos crudos del backend a la interfaz `Person`.
 * Maneja tanto `personId` (backend) como `id` (Drizzle) como clave primaria.
 */
export const normalizePerson = (data: Record<string, unknown>): Person => ({
  id: (data.id as number) || (data.personId as number) || 0,
  personId: (data.personId as number) || (data.id as number) || 0,
  firstName: (data.firstName as string) || '',
  lastName: (data.lastName as string) || '',
  identType: data.identType as number | undefined,
  idCard: (data.idCard as string) || '',
  email: (data.email as string) || '',
  phone: data.phone as string | null,
  birthDate: data.birthDate as string | null,
  sex: data.sex as string | number | null,
  gender: data.gender as string | number | null,
  maritalStatusTypeId:
    (data.maritalStatusTypeId as number) ??
    (data.maritalStatusTypeID as number) ??
    null,
  ethnicityTypeId:
    (data.ethnicityTypeId as number) ?? (data.ethnicityTypeID as number) ?? null,
  countryId: (data.countryId as number | string) ?? null,
  provinceId: (data.provinceId as number | string) ?? null,
  cantonId: (data.cantonId as number | string) ?? null,
  address: data.address as string | null,
  disability: data.disability as string | null,
  isActive: (data.isActive as boolean) ?? true,
  motherName: data.motherName as string | null,
  fatherName: data.fatherName as string | null,
  bloodTypeTypeId: data.bloodTypeTypeId as number | null,
  specialNeedsTypeId: data.specialNeedsTypeId as number | null,
  disabilityPercentage: data.disabilityPercentage as number | null,
  conadisCard: data.conadisCard as string | null,
  yearsOfResidence: data.yearsOfResidence as number | null,
  militaryCard: data.militaryCard as string | null,
  createdAt: data.createdAt as string | null,
  updatedAt: data.updatedAt as string | null,
});

export const normalizePublication = (data: Record<string, unknown>): Publication => ({
  publicationId: (data.publicationId as number) || (data.id as number) || 0,
  personId: (data.personId as number) || 0,
  title: (data.title as string) || '',
  journalName: data.journalName as string | undefined,
  journalNumber: data.journalNumber as string | undefined,
  volume: data.volume as string | undefined,
  pages: data.pages as string | undefined,
  issn_Isbn: data.issn_Isbn as string | undefined,
  location: data.location as string | undefined,
  publicationTypeId: data.publicationTypeId as number | undefined,
  journalTypeId: data.journalTypeId as number | undefined,
  isIndexed: data.isIndexed as boolean | undefined,
  knowledgeAreaTypeId: data.knowledgeAreaTypeId as number | undefined,
  subAreaTypeId: data.subAreaTypeId as number | undefined,
  areaTypeId: data.areaTypeId as number | undefined,
  organizedBy: data.organizedBy as string | undefined,
  eventName: data.eventName as string | undefined,
  eventEdition: data.eventEdition as string | undefined,
  publicationDate: data.publicationDate as string | undefined,
  utAffiliation: data.utAffiliation as boolean | undefined,
  notes: data.notes as string | undefined,
});
