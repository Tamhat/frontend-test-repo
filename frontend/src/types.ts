export enum UserRole {
    ADMIN = 'ADMIN',
    AUDITOR = 'AUDITOR',
    COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
    FUND_MANAGER = 'FUND_MANAGER',
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status?: string;
}

export interface Fund {
    id: string;
    code: string;
    name: string;
    region: string;
    currency: string;
}

export enum DocType {
    ANNUAL_REPORT = 'ANNUAL_REPORT',
    COMPLIANCE_CERT = 'COMPLIANCE_CERT',
    RISK_DISCLOSURE = 'RISK_DISCLOSURE',
    REGULATORY_FILING = 'REGULATORY_FILING',
    INTERNAL_MEMO = 'INTERNAL_MEMO',
    OTHER = 'OTHER',
}

export enum DocStatus {
    PENDING = 'PENDING',
    IN_REVIEW = 'IN_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    ARCHIVED = 'ARCHIVED',
}

export interface Document {
    id: string;
    title: string;
    fundId: string;
    fund: Fund;
    type: DocType;
    status: DocStatus;
    periodStart: string;
    periodEnd: string;
    fileKey: string;
    uploadedById: string;
    createdAt: string;
    updatedAt: string;
}
