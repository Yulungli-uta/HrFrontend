// src/types/personnel-actions.ts

export interface PersonnelActionSummary {
    actionId: number;
    employeeId: number;
    employeeFullName: string;
    employeeIdCard: string;
    actionTypeId: number;
    actionTypeName: string;
    actionNumber?: string | null;
    actionDate: string;
    effectiveDate?: string | null;
    endDate?: string | null;
    status: string;
    generatedDocumentId?: number | null;
    createdAt?: string | null;
}

export interface PersonnelActionDetail extends PersonnelActionSummary {
    employeeDepartment: string;
    employeeJobTitle: string;

    originDepartmentId?: number | null;
    originDepartmentName?: string | null;
    originJobId?: number | null;
    originJobTitle?: string | null;
    originBudgetCode?: string | null;

    destinationDepartmentId?: number | null;
    destinationDepartmentName?: string | null;
    destinationJobId?: number | null;
    destinationJobTitle?: string | null;
    destinationBudgetCode?: string | null;

    previousRmu?: number | null;
    newRmu?: number | null;

    legalBasis?: string | null;
    reason?: string | null;
    observations?: string | null;

    generatedDocumentFileName?: string | null;
    contractId?: number | null;
    movementId?: number | null;

    swornDeclaration?: boolean | null;
    institutionalProcess?: number | null;
    managementLevel?: number | null;
    employeeTypeId?: number | null;
    employeeTypeName?: string | null;

    dthDirectorId?: number | null;
    dthDirectorName?: string | null;
    dthDirectorTitle?: string | null;
    authorityNominatorId?: number | null;
    authorityNominatorName?: string | null;
    authorityNominatorTitle?: string | null;
    elaboratorId?: number | null;
    elaboratorName?: string | null;
    elaboratorTitle?: string | null;
    reviewerId?: number | null;
    reviewerName?: string | null;
    reviewerTitle?: string | null;
    registrarId?: number | null;
    registrarName?: string | null;
    registrarTitle?: string | null;

    createdBy?: number | null;
    updatedAt?: string | null;
    updatedBy?: number | null;

    // Flags del tipo de acción incluidos por el backend al devolver el detalle
    actionTypeRequiresAdUserDisable?: boolean;
    actionTypeRequiresAdUserCreation?: boolean;
}

export interface CreatePersonnelActionRequest {
    personId: number;
    employeeId: number;
    actionTypeId: number;
    actionNumber?: string | null;
    actionDate: string;
    effectiveDate?: string | null;
    endDate?: string | null;

    originDepartmentId?: number | null;
    originJobId?: number | null;
    originBudgetCode?: string | null;

    destinationDepartmentId?: number | null;
    destinationJobId?: number | null;
    destinationBudgetCode?: string | null;

    previousRmu?: number | null;
    newRmu?: number | null;

    legalBasis?: string | null;
    reason?: string | null;
    observations?: string | null;

    contractId?: number | null;
    movementId?: number | null;
    employeeTypeId?: number | null;

    swornDeclaration?: boolean | null;
    institutionalProcess?: number | null;
    managementLevel?: number | null;

    dthDirectorId?: number | null;
    authorityNominatorId?: number | null;
    elaboratorId?: number | null;
    reviewerId?: number | null;
    registrarId?: number | null;

    generateDocument?: boolean;
    documentOverrides?: Record<string, string> | null;
}

export interface UpdatePersonnelActionRequest
    extends Omit<
        CreatePersonnelActionRequest,
        'personId' | 'employeeId' | 'actionTypeId' | 'generateDocument' | 'documentOverrides'
    > { }

export interface ApprovePersonnelActionRequest {
    notes?: string | null;
    generateDocumentIfMissing?: boolean;
}

export interface PersonnelActionQueryFilter {
    employeeId?: number | null;
    actionTypeId?: number | null;
    status?: string | null;
    search?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    page?: number;
    pageSize?: number;
}

export interface PagedPersonnelActionResult {
    items: PersonnelActionSummary[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface CreatePersonnelActionResponse {
    actionId: number;
    actionNumber?: string | null;
    status: string;
    generatedDocumentId?: number | null;
    pdfBase64?: string | null;
    fileName?: string | null;
}

export interface GenerateDocumentOverridesRequest {
    overrides?: Record<string, string> | null;
}

export interface UploadSignedDocumentRequest {
    storedFileId: number;
    comment?: string | null;
}

export interface CancelPersonnelActionRequest {
    reason: string;
}

export interface CommentRequest {
    comment?: string | null;
}

export interface PersonnelActionStatusHistory {
    historyId: number;
    actionId: number;
    statusTypeId?: number | null;
    fromStatus?: string | null;
    statusCode: string;
    comment?: string | null;
    changedBy?: number | null;
    changedAt: string;
}