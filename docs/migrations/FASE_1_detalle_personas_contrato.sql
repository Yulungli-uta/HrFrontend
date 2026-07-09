-- ============================================================
-- FASE 1: Migración — Detalle de personas por solicitud de contrato
-- Proyecto: HrBackend / HrFrontend
-- Fecha: 2026-05-08
--
-- Reglas:
--   - Idempotente: verificar existencia antes de crear/alterar
--   - Sin eliminación física de datos
--   - No agrega JobTypeID a HR.tbl_jobs
--   - RequestPersonType usa HR.ref_Types Category = JOB_TYPE
-- ============================================================

USE HrDb; -- ajustar al nombre de la BD del proyecto
GO

-- ============================================================
-- 1. ALTER HR.tbl_contractRequest: StartDate y EndDate
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'HR' AND TABLE_NAME = 'tbl_contractRequest' AND COLUMN_NAME = 'StartDate'
)
    ALTER TABLE HR.tbl_contractRequest ADD StartDate DATE NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'HR' AND TABLE_NAME = 'tbl_contractRequest' AND COLUMN_NAME = 'EndDate'
)
    ALTER TABLE HR.tbl_contractRequest ADD EndDate DATE NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'HR' AND TABLE_NAME = 'tbl_contractRequest' AND COLUMN_NAME = 'PendingCorrectionReason'
)
    ALTER TABLE HR.tbl_contractRequest ADD PendingCorrectionReason NVARCHAR(1000) NULL;

-- ============================================================
-- 2. ALTER HR.tbl_FinancialCertification: campos rechazo temporal
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'HR' AND TABLE_NAME = 'tbl_FinancialCertification' AND COLUMN_NAME = 'RejectionReason'
)
    ALTER TABLE HR.tbl_FinancialCertification ADD RejectionReason NVARCHAR(1000) NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'HR' AND TABLE_NAME = 'tbl_FinancialCertification' AND COLUMN_NAME = 'RejectedAt'
)
    ALTER TABLE HR.tbl_FinancialCertification ADD RejectedAt DATETIME2 NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'HR' AND TABLE_NAME = 'tbl_FinancialCertification' AND COLUMN_NAME = 'RejectedBy'
)
    ALTER TABLE HR.tbl_FinancialCertification ADD RejectedBy INT NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'HR' AND TABLE_NAME = 'tbl_FinancialCertification' AND COLUMN_NAME = 'RejectionTypeID'
)
    ALTER TABLE HR.tbl_FinancialCertification ADD RejectionTypeID INT NULL;

-- ============================================================
-- 3. HR.ref_Types — nuevos catálogos
-- ============================================================

-- Estado de solicitud: PENDIENTE_CORRECCION
IF NOT EXISTS (SELECT 1 FROM HR.ref_Types WHERE Category = 'CONTRACT_REQUEST_STATUS' AND Name = 'PENDIENTE_CORRECCION')
    INSERT INTO HR.ref_Types (Category, Name, Description, IsActive)
    VALUES ('CONTRACT_REQUEST_STATUS', 'PENDIENTE_CORRECCION',
            'Solicitud rechazada temporalmente por financiero, pendiente de corrección', 1);

-- Estado de certificación: RECHAZADA_TEMPORAL
IF NOT EXISTS (SELECT 1 FROM HR.ref_Types WHERE Category = 'FIN_CERT_STATUS' AND Name = 'RECHAZADA_TEMPORAL')
    INSERT INTO HR.ref_Types (Category, Name, Description, IsActive)
    VALUES ('FIN_CERT_STATUS', 'RECHAZADA_TEMPORAL',
            'Certificación rechazada temporalmente; la solicitud puede ser corregida y reenviada', 1);

-- JOB_TYPE: determina si el cálculo es ADMINISTRATIVO o DOCENTE en el detalle
IF NOT EXISTS (SELECT 1 FROM HR.ref_Types WHERE Category = 'JOB_TYPE' AND Name = 'ADMINISTRATIVO')
    INSERT INTO HR.ref_Types (Category, Name, Description, IsActive)
    VALUES ('JOB_TYPE', 'ADMINISTRATIVO', 'Cargo administrativo — RMU fijo desde el cargo', 1);

IF NOT EXISTS (SELECT 1 FROM HR.ref_Types WHERE Category = 'JOB_TYPE' AND Name = 'DOCENTE')
    INSERT INTO HR.ref_Types (Category, Name, Description, IsActive)
    VALUES ('JOB_TYPE', 'DOCENTE', 'Cargo docente — RMU calculado por WeeklyClassHours * HourValue * 4', 1);

-- Fuente de ingreso del detalle de persona
IF NOT EXISTS (SELECT 1 FROM HR.ref_Types WHERE Category = 'CONTRACT_REQUEST_PERSON_SOURCE' AND Name = 'REQUEST')
    INSERT INTO HR.ref_Types (Category, Name, Description, IsActive)
    VALUES ('CONTRACT_REQUEST_PERSON_SOURCE', 'REQUEST',
            'Persona ingresada directamente desde la solicitud de contrato', 1);

IF NOT EXISTS (SELECT 1 FROM HR.ref_Types WHERE Category = 'CONTRACT_REQUEST_PERSON_SOURCE' AND Name = 'CONTRACT')
    INSERT INTO HR.ref_Types (Category, Name, Description, IsActive)
    VALUES ('CONTRACT_REQUEST_PERSON_SOURCE', 'CONTRACT',
            'Persona agregada durante el proceso de generación de contrato', 1);

-- Estados del detalle de persona
DECLARE @statusRows TABLE (Name NVARCHAR(100), Description NVARCHAR(500));
INSERT INTO @statusRows VALUES
    ('PENDIENTE',    'Persona registrada, sin acción tomada'),
    ('SELECCIONADO', 'Persona seleccionada para ser contratada'),
    ('CONTRATADO',   'Persona contratada — contrato generado y asociado'),
    ('RECHAZADO',    'Persona rechazada del proceso de contratación'),
    ('CANCELADO',    'Persona cancelada del proceso'),
    ('INACTIVO',     'Registro inactivo por anulación de contrato asociado');

INSERT INTO HR.ref_Types (Category, Name, Description, IsActive)
SELECT 'CONTRACT_REQUEST_PERSON_STATUS', s.Name, s.Description, 1
FROM @statusRows s
WHERE NOT EXISTS (
    SELECT 1 FROM HR.ref_Types
    WHERE Category = 'CONTRACT_REQUEST_PERSON_STATUS' AND Name = s.Name
);

-- ============================================================
-- 4. CREAR HR.tbl_contractRequestPerson
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'HR' AND TABLE_NAME = 'tbl_contractRequestPerson'
)
BEGIN
    CREATE TABLE HR.tbl_contractRequestPerson (
        RequestPersonID   INT          IDENTITY(1,1) NOT NULL,
        RequestID         INT          NOT NULL,
        PersonID          INT          NULL,
        -- Tipo de cálculo: FK a HR.ref_Types Category='JOB_TYPE' (ADMINISTRATIVO | DOCENTE)
        RequestPersonType INT          NOT NULL,
        JobID             INT          NOT NULL,
        StartDate         DATE         NULL,
        EndDate           DATE         NULL,
        WeeklyClassHours  DECIMAL(10,2) NULL,
        HourValue         DECIMAL(10,2) NULL,
        MonthsPeriod      DECIMAL(10,4) NULL,
        RMU               DECIMAL(10,2) NULL,
        RMUPeriod         DECIMAL(10,2) NULL,
        -- Fuente de ingreso: FK a HR.ref_Types Category='CONTRACT_REQUEST_PERSON_SOURCE'
        EntrySourceID     INT          NOT NULL,
        IsHired           BIT          NOT NULL CONSTRAINT DF_tbl_crPerson_IsHired   DEFAULT(0),
        ContractID        INT          NULL,
        HiredAt           DATETIME2    NULL,
        HiredBy           INT          NULL,
        Observation       NVARCHAR(1000) NULL,
        IsActive          BIT          NOT NULL CONSTRAINT DF_tbl_crPerson_IsActive  DEFAULT(1),
        InactiveAt        DATETIME2    NULL,
        InactiveBy        INT          NULL,
        InactiveReason    NVARCHAR(500) NULL,
        CreatedAt         DATETIME2    NOT NULL CONSTRAINT DF_tbl_crPerson_CreatedAt DEFAULT(GETUTCDATE()),
        CreatedBy         INT          NOT NULL,
        UpdatedAt         DATETIME2    NULL,
        UpdatedBy         INT          NULL,
        -- Estado del registro: FK a HR.ref_Types Category='CONTRACT_REQUEST_PERSON_STATUS'
        StatusID          INT          NOT NULL,

        CONSTRAINT PK_tbl_contractRequestPerson PRIMARY KEY (RequestPersonID),

        CONSTRAINT FK_tbl_crPerson_Request
            FOREIGN KEY (RequestID)         REFERENCES HR.tbl_contractRequest(RequestID),

        CONSTRAINT FK_tbl_crPerson_Person
            FOREIGN KEY (PersonID)          REFERENCES HR.tbl_People(PersonID),

        CONSTRAINT FK_tbl_crPerson_RequestPersonType
            FOREIGN KEY (RequestPersonType) REFERENCES HR.ref_Types(TypeID),

        CONSTRAINT FK_tbl_crPerson_Job
            FOREIGN KEY (JobID)             REFERENCES HR.tbl_jobs(JobID),

        CONSTRAINT FK_tbl_crPerson_EntrySource
            FOREIGN KEY (EntrySourceID)     REFERENCES HR.ref_Types(TypeID),

        CONSTRAINT FK_tbl_crPerson_Status
            FOREIGN KEY (StatusID)          REFERENCES HR.ref_Types(TypeID),

        CONSTRAINT FK_tbl_crPerson_Contract
            FOREIGN KEY (ContractID)        REFERENCES HR.tbl_Contracts(ContractID)
    );

    -- Índices de acceso frecuente
    CREATE INDEX IX_crPerson_RequestID  ON HR.tbl_contractRequestPerson (RequestID);
    CREATE INDEX IX_crPerson_PersonID   ON HR.tbl_contractRequestPerson (PersonID);
    CREATE INDEX IX_crPerson_ContractID ON HR.tbl_contractRequestPerson (ContractID);
    -- Índice compuesto para consultas de cupos disponibles
    CREATE INDEX IX_crPerson_Slots
        ON HR.tbl_contractRequestPerson (RequestID, IsActive, IsHired);
END

-- ============================================================
-- 5. CREAR HR.tbl_FinancialCertificationRejectionHistory
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'HR' AND TABLE_NAME = 'tbl_FinancialCertificationRejectionHistory'
)
BEGIN
    CREATE TABLE HR.tbl_FinancialCertificationRejectionHistory (
        RejectionHistoryID INT          IDENTITY(1,1) NOT NULL,
        CertificationID    INT          NOT NULL,
        -- Tipo de rechazo: FK a HR.ref_Types Category='FIN_CERT_STATUS'
        RejectionTypeID    INT          NOT NULL,
        RejectionReason    NVARCHAR(1000) NOT NULL,
        RejectedAt         DATETIME2    NOT NULL CONSTRAINT DF_FinCertRejHist_RejAt DEFAULT(GETUTCDATE()),
        RejectedBy         INT          NOT NULL,
        Notes              NVARCHAR(2000) NULL,

        CONSTRAINT PK_tbl_FinCertRejectionHistory PRIMARY KEY (RejectionHistoryID),

        CONSTRAINT FK_FinCertRejHist_Cert
            FOREIGN KEY (CertificationID) REFERENCES HR.tbl_FinancialCertification(CertificationID),

        CONSTRAINT FK_FinCertRejHist_RejType
            FOREIGN KEY (RejectionTypeID) REFERENCES HR.ref_Types(TypeID)
    );

    CREATE INDEX IX_FinCertRejHist_CertID
        ON HR.tbl_FinancialCertificationRejectionHistory (CertificationID);
END

-- ============================================================
-- 6. FK: tbl_FinancialCertification → RejectionTypeID
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_NAME = 'FK_FinCert_RejectionType'
)
    ALTER TABLE HR.tbl_FinancialCertification
    ADD CONSTRAINT FK_FinCert_RejectionType
        FOREIGN KEY (RejectionTypeID) REFERENCES HR.ref_Types(TypeID);

GO
PRINT 'FASE 1 completada correctamente.';
GO
