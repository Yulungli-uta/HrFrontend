export type ContractDto = {
  contractID: number;

  certificationID?: number | null;
  parentID?: number | null;

  contractCode: string;

  personID: number;
  contractTypeID: number;
  jobID?: number | null;

  startDate: string; // ISO
  endDate: string;   // ISO

  contractFileName?: string | null;
  contractFilepath?: string | null;

  status: number;
  contractDescription?: string | null;

  departmentID: number;
  authorizationDate?: string | null;

  resignationFileName?: string | null;
  resignationFilepath?: string | null;
  resignationCode?: string | null;

  regResignationDate?: string | null;
  resignationDate?: string | null;

  cancelReason?: string | null;
  cancelFilename?: string | null;
  cancelFilepath?: string | null;
  cancelCode?: string | null;

  registrationDateAnulCon?: string | null;

  nationality?: string | null;
  visa?: string | null;
  consulate?: string | null;
  workOf?: string | null;

  inicialContent?: string | null;
  resolucionContent?: string | null;

  relationshipType?: number | null;
  relationship?: string | null;

  competition?: string | null;
  competitionDate?: string | null;

  createdBy?: number | null;
  createdAt: string;
  updatedBy?: number | null;
  updatedAt?: string | null;

  rowVersion: string; // si lo envías como base64 desde backend; si no, ajusta
};

export type ContractsCreateDto = {
  certificationID?: number | null;
  parentID?: number | null;

  contractCode: string;

  personID: number;
  contractTypeID: number;
  jobID?: number | null;

  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"

  contractFileName?: string | null;
  contractFilepath?: string | null;

  status: number;

  contractDescription?: string | null;

  departmentID: number;

  authorizationDate?: string | null;

  resignationFileName?: string | null;
  resignationFilepath?: string | null;
  resignationCode?: string | null;

  regResignationDate?: string | null;
  resignationDate?: string | null;

  cancelReason?: string | null;
  cancelFilename?: string | null;
  cancelFilepath?: string | null;
  cancelCode?: string | null;

  registrationDateAnulCon?: string | null;

  nationality?: string | null;
  visa?: string | null;
  consulate?: string | null;
  workOf?: string | null;

  inicialContent?: string | null;
  resolucionContent?: string | null;

  relationshipType?: number | null;
  relationship?: string | null;

  competition?: string | null;
  competitionDate?: string | null;
};

export type ContractsUpdateDto = ContractsCreateDto & {
  contractID: number;
  rowVersion?: string; // opcional si estás usando concurrencia
};
