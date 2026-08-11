// src/features/constants.ts
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";

export interface ParameterDomain {
  key: string;
  label: string;
  categories: string[];
}

// NOTA: las categorías de estos dominios deben existir tal cual en HR.ref_Types.
// NATIONALITY, EDUCATION_LEVEL, DEGREE_TYPE, PERMISSION_TYPE, OVERTIME_TYPE,
// JOB_ACTIVITY_TYPE y EMPLOYEE_TYPE se quitaron de aquí porque esos datos viven
// en tablas dedicadas propias (Countries, EducationLevels, Degree, PermissionTypes,
// OvertimeConfig, JobActivity) y no son categorías de ref_Types — antes producían
// listas vacías silenciosas en la pantalla de parámetros. MOVEMENT_TYPE también se
// quitó: PersonnelMovements.MovementType es texto libre, no tiene categoría ref_Types equivalente.
export const HR_PARAMETER_DOMAINS: ParameterDomain[] = [
  {
    key: 'acciones',
    label: 'Acciones de Personal',
    categories: [REF_TYPE_CATEGORIES.PERSONNEL_ACTION_STATUS, REF_TYPE_CATEGORIES.AP_NIVEL_GESTION, REF_TYPE_CATEGORIES.AP_PROCESO_INSTITUCIONAL],
  },
  {
    key: 'empleados',
    label: 'Empleados',
    categories: [REF_TYPE_CATEGORIES.CONTRACT_TYPE],
  },
  {
    key: 'personal',
    label: 'Datos Personales',
    categories: [REF_TYPE_CATEGORIES.MARITAL_STATUS, REF_TYPE_CATEGORIES.BLOOD_TYPE, REF_TYPE_CATEGORIES.GENDER_TYPE, REF_TYPE_CATEGORIES.ETHNICITY, REF_TYPE_CATEGORIES.DISABILITY_TYPE],
  },
  {
    key: 'cv',
    label: 'CV y Formación',
    categories: [
      REF_TYPE_CATEGORIES.BOOK_TYPE, REF_TYPE_CATEGORIES.PUBLICATION_TYPE, REF_TYPE_CATEGORIES.RELATIONSHIP, REF_TYPE_CATEGORIES.EVENT_TYPE,
      REF_TYPE_CATEGORIES.TRAINING_DIRECTION, REF_TYPE_CATEGORIES.TRAINING_MODALITY, REF_TYPE_CATEGORIES.LANGUAGE, REF_TYPE_CATEGORIES.LANGUAGE_LEVEL,
    ],
  },
  {
    key: 'contratos',
    label: 'Contratos',
    categories: [REF_TYPE_CATEGORIES.CONTRACT_STATUS, REF_TYPE_CATEGORIES.CERT_APPROVAL_TYPE],
  },
];

export const HR_PARAMETER_CATEGORIES = HR_PARAMETER_DOMAINS.flatMap(d => d.categories);

export const GUARD_PARAMETER_DOMAINS: ParameterDomain[] = [
  {
    key: 'bloques',
    label: 'Bloques y Fuentes',
    categories: [REF_TYPE_CATEGORIES.GUARD_BLOCK_SOURCE, REF_TYPE_CATEGORIES.GUARD_BLOCK_TYPE, REF_TYPE_CATEGORIES.GUARD_SHIFT_TYPE],
  },
  {
    key: 'grupos',
    label: 'Grupos y Niveles',
    categories: [REF_TYPE_CATEGORIES.GUARD_GROUP_LEVEL_TYPE, REF_TYPE_CATEGORIES.GUARD_GROUP_STATUS],
  },
  {
    key: 'reglas',
    label: 'Reglas y Cobertura',
    categories: [REF_TYPE_CATEGORIES.GUARD_SPECIAL_RULE_TYPE, REF_TYPE_CATEGORIES.GUARD_COVERAGE_TYPE, REF_TYPE_CATEGORIES.GUARD_VALIDATION_TYPE],
  },
];

export const GUARD_PARAMETER_CATEGORIES = GUARD_PARAMETER_DOMAINS.flatMap(d => d.categories);

export const FINANCE_CERTIFICATION_DIRECTORY_CODE = "FINCERT";
export const FINANCE_CERTIFICATION_ENTITY_TYPE = "FINCERT";

export const CONTRACT_REQUEST_DIRECTORY_CODE = "HRCONTRAC_REQUEST";
export const CONTRACT_REQUEST_ENTITY_TYPE = "CONTRACT_REQUEST";

export const PERMISSION_DIRECTORY_CODE = "HRPERMISSION";
export const PERMISSION_ENTITY_TYPE = "PERMISSION";

export const CONTRACT_DIRECTORY_CODE = "HRCONTRACT";
export const CONTRACT_ENTITY_TYPE = "HRCONTRACT";

export const PERSONNEL_ACTION_DIRECTORY_CODE = "HRPERSONNEL_ACTION";
export const PERSONNEL_ACTION_ENTITY_TYPE = "PersonnelAction";

export const RESIGNATION_RETIREMENT_DIRECTORY_CODE = "HR_RESIGNATION_RETIREMENT";
export const RESIGNATION_RETIREMENT_ENTITY_TYPE = "RESIGNATION_RETIREMENT_REQUEST";

// Un solo expediente digital para TODA la hoja de vida — un único DirectoryParameters
// (HR_HOJA_DE_VIDA), diferenciado dentro por identificación de la persona + tipo de
// módulo (via relativePath), en vez de un directorio físico distinto por módulo.
// Así el archivo completo de una persona queda agrupado en una sola carpeta raíz.
export const HOJA_DE_VIDA_DIRECTORY_CODE = "HR_HOJA_DE_VIDA";

export const LANGUAGE_CERTIFICATION_DIRECTORY_CODE = HOJA_DE_VIDA_DIRECTORY_CODE;
export const LANGUAGE_CERTIFICATION_ENTITY_TYPE = "LANGUAGE";

export const EDUCATION_CERTIFICATE_DIRECTORY_CODE = HOJA_DE_VIDA_DIRECTORY_CODE;
export const EDUCATION_CERTIFICATE_ENTITY_TYPE = "EDUCATION_LEVEL";

export const WORK_EXPERIENCE_CERTIFICATE_DIRECTORY_CODE = HOJA_DE_VIDA_DIRECTORY_CODE;
export const WORK_EXPERIENCE_CERTIFICATE_ENTITY_TYPE = "WORK_EXPERIENCE";

export const TRAINING_CERTIFICATE_DIRECTORY_CODE = HOJA_DE_VIDA_DIRECTORY_CODE;
export const TRAINING_CERTIFICATE_ENTITY_TYPE = "TRAINING";

export const PUBLICATION_DOCUMENT_DIRECTORY_CODE = HOJA_DE_VIDA_DIRECTORY_CODE;
export const PUBLICATION_DOCUMENT_ENTITY_TYPE = "PUBLICATION";

export const BOOK_DOCUMENT_DIRECTORY_CODE = HOJA_DE_VIDA_DIRECTORY_CODE;
export const BOOK_DOCUMENT_ENTITY_TYPE = "BOOK";

export const FAMILY_MEMBER_DOCUMENT_DIRECTORY_CODE = HOJA_DE_VIDA_DIRECTORY_CODE;
export const FAMILY_MEMBER_DOCUMENT_ENTITY_TYPE = "FAMILY_MEMBER";

export const CATASTROPHIC_ILLNESS_CERTIFICATE_DIRECTORY_CODE = HOJA_DE_VIDA_DIRECTORY_CODE;
export const CATASTROPHIC_ILLNESS_CERTIFICATE_ENTITY_TYPE = "CATASTROPHIC_ILLNESS";

export const PERSON_PHOTO_DIRECTORY_CODE = HOJA_DE_VIDA_DIRECTORY_CODE;
export const PERSON_PHOTO_ENTITY_TYPE = "PERSON";