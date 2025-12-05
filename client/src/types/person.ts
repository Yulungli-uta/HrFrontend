
export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  idCard: string;
  email: string;
  phone?: string;
  birthDate?: string;
  sex?: string;
  gender?: string;
  address?: string;
  disability?: string;
  isActive: boolean;
}

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

  // Si backend envía nombres
  publicationTypeName?: string;
  journalTypeName?: string;
}

export interface FamilyMember {
  burdenId: number;
  personId: number;
  firstName: string;
  lastName: string;
  dependentId: string;
  identificationTypeId: number;  // Ahora es number
  birthDate: string;
  relationship: string;
  disabilityTypeId?: number;  // Cambiado de disabilityType
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
  startDate: string;           // date
  endDate?: string | null;     // date
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

  // NUEVOS / AJUSTADOS
  knowledgeAreaTypeId?: number;
  eventTypeId: number;        // ahora número, no string
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

  countryId?: string; // en el form lo manejamos como string, lo casteamos a number al enviar
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

  // Si usas estos campos en BooksTab:
  coAuthors?: string;
  category?: string;
  description?: string;
}

export interface EmergencyContact {
  contactId: number;      // 0 si es nuevo
  personId: number;
  identification: string;
  firstName: string;
  lastName: string;
  relationshipTypeId: number;
  address: string | null;
  phone: string;
  mobile: string | null;
  createdAt: string;      // ISO
}

// Helper functions para normalizar datos
export const normalizePerson = (data: any): Person => ({
  id: data.id || data.personId || 0,
  firstName: data.firstName || '',
  lastName: data.lastName || '',
  idCard: data.idCard || '',
  email: data.email || '',
  phone: data.phone,
  birthDate: data.birthDate,
  sex: data.sex,
  gender: data.gender,
  address: data.address,
  disability: data.disability,
  isActive: data.isActive ?? true,
});

export const normalizePublication = (data: any): Publication => ({
  publicationId: data.publicationId || data.id || 0,
  personId: data.personId || 0,

  title: data.title || '',

  journalName: data.journalName,
  journalNumber: data.journalNumber,
  volume: data.volume,
  pages: data.pages,
  issn_Isbn: data.issn_Isbn,
  location: data.location,

  publicationTypeId: data.publicationTypeId,
  journalTypeId: data.journalTypeId,

  isIndexed: data.isIndexed,

  knowledgeAreaTypeId: data.knowledgeAreaTypeId,
  subAreaTypeId: data.subAreaTypeId,
  areaTypeId: data.areaTypeId,

  organizedBy: data.organizedBy,
  eventName: data.eventName,
  eventEdition: data.eventEdition,

  publicationDate: data.publicationDate,
  utAffiliation: data.utAffiliation,

  notes: data.notes,
});