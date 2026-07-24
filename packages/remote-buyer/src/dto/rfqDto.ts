export interface RfqDocumentAssetDto {
  entityType: string;
  entityId: string;
  assetType: string;
  fileBytes: string; 
  fileName: string;
  contentType: string;
  isSingletonAsset: boolean;
  id?: string;
}

export interface RfqQuestionDto {
  question: string;
  questionType: string; 
  isRequired: boolean;
  displayOrder: number;
  options: string[];
}

export interface RfqItemDto {
  description: string;
  quantity: number;
  uom: string;
  materialCode: string;
  materialGroup: string;
  costCenter: string;
  attachments: RfqDocumentAssetDto[];
}

export interface CreateRFQPayload {
  title: string;
  description: string;
  department: string;
  region: string;
  currency: string;
  deliveryLocation: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  deliveryTargetDate: string; // ISO 8601
  budget: number;
  addLotOption: boolean;
  technicalSpecificationDocuments: RfqDocumentAssetDto[];
  termsConditionDocuments: RfqDocumentAssetDto[];
  questions: RfqQuestionDto[];
  items: RfqItemDto[];
  supplierIds: string[];
  rfqVerificationTemplateId: string | null;
}

export interface CreateRFQResponse {
  statusCode: number;
  message: string;
  description: string;
  id: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  description: string;
}


export type SupplierVerificationType = "VERIFIED" | "UNVERIFIED";

export interface VerifiedSupplierSearchPayload {
  index: number;
  limit: number;
  searchTerm?: string;
  segmentCode?: string;
  familyCode?: string;
  type?: SupplierVerificationType;
  buyerId: string;
}

export interface VerifiedSupplierDto {
  supplierId: string;
  supplierName: string;
  email: string;
  isVerified: boolean;
}