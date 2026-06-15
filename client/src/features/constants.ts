// src/features/constants.ts

export interface ParameterDomain {
  key: string;
  label: string;
  categories: string[];
}

export const HR_PARAMETER_DOMAINS: ParameterDomain[] = [
  {
    key: 'acciones',
    label: 'Acciones de Personal',
    categories: ['PERSONNEL_ACTION_STATUS', 'MOVEMENT_TYPE', 'MANAGEMENT_LEVEL', 'INSTITUTIONAL_PROCESS'],
  },
  {
    key: 'empleados',
    label: 'Empleados',
    categories: ['EMPLOYEE_TYPE', 'CONTRACT_TYPE'],
  },
  {
    key: 'personal',
    label: 'Datos Personales',
    categories: ['MARITAL_STATUS', 'BLOOD_TYPE', 'GENDER', 'NATIONALITY', 'ETHNIC_GROUP', 'DISABILITY_TYPE'],
  },
  {
    key: 'cv',
    label: 'CV y Formación',
    categories: ['EDUCATION_LEVEL', 'DEGREE_TYPE', 'BOOK_TYPE', 'PUBLICATION_TYPE', 'FAMILY_RELATION', 'TRAINING_TYPE'],
  },
  {
    key: 'contratos',
    label: 'Contratos',
    categories: ['CONTRACT_STATUS', 'CERTIFICATION_STATUS'],
  },
  {
    key: 'otros',
    label: 'Otros',
    categories: ['PERMISSION_TYPE', 'OVERTIME_TYPE', 'JOB_ACTIVITY_TYPE'],
  },
];

export const HR_PARAMETER_CATEGORIES = HR_PARAMETER_DOMAINS.flatMap(d => d.categories);

export const GUARD_PARAMETER_DOMAINS: ParameterDomain[] = [
  {
    key: 'bloques',
    label: 'Bloques y Fuentes',
    categories: ['GUARD_BLOCK_SOURCE', 'GUARD_BLOCK_TYPE', 'GUARD_SHIFT_TYPE'],
  },
  {
    key: 'grupos',
    label: 'Grupos y Niveles',
    categories: ['GUARD_GROUP_LEVEL_TYPE', 'GUARD_GROUP_STATUS'],
  },
  {
    key: 'reglas',
    label: 'Reglas y Cobertura',
    categories: ['GUARD_SPECIAL_RULE_TYPE', 'GUARD_COVERAGE_TYPE', 'GUARD_VALIDATION_TYPE'],
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