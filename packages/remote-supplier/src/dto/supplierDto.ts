// supplierDto.ts

// ============================================================================
// METADATA / REFERENCE LIST DTOs
// ============================================================================

export type MetadataReferenceType =
  | 'INDUSTRY'
  | 'BUSINESS_TYPE'
  | 'DOCUMENT_TYPE'
  | 'ENTITY_TYPE';

export interface MetadataReferenceItem {
  id: string;
  key: string;
  type: MetadataReferenceType;
  description: string | null;
}

export type MetadataReferenceListRequest = MetadataReferenceType[];
export type MetadataReferenceListResponse = MetadataReferenceItem[];

// ============================================================================
// SUPPLIER BUSINESS PROFILE
// ============================================================================

export interface BusinessProfileDto {
  organizationName: string;
  email: string;
  phone: string;
  emailVerified?: boolean;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  industry: string;      // metadata key from INDUSTRY, e.g. 'MANUFACTURING'
  businessType: string;  // metadata key from BUSINESS_TYPE, e.g. 'EXPORTER'
  employeeCount: number;
  annualTurnover: number;
  currency: string;
  yearEstablished: number;
  website: string;
  description: string;
  status?: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
}

// ============================================================================
// REGISTRATIONS / CERTIFICATIONS
// ============================================================================

export interface AssetDto {
  id?: string;
  entityType: string; // metadata key from ENTITY_TYPE, e.g. 'SUPPLIER'
  entityId: string;
  assetType: string;  // metadata key from DOCUMENT_TYPE, e.g. 'GST'
  fileName: string;
  contentType: string;
  isSingletonAsset: boolean;
  fileBytes: string;
}

export interface RegistrationDto {
  id?: string;
  registrationType: string; // metadata key from DOCUMENT_TYPE
  registrationNumber: string;
  registrationName: string;
  asset: AssetDto | null;
  expiryDate: string | null;
}

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export interface BankAccountDto {
  id?: string;
  accountHolderName: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode: string;
  iban: string;
  currency: string;
  isPrimary: boolean;
}

// ============================================================================
// DISPATCH LOCATIONS
// ============================================================================

export interface DispatchLocationDto {
  id?: string;
  locationName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  isDefault: boolean;
}

// ============================================================================
// SUPPLIER PROFILE — READ (GET /supplier/profile)
// ============================================================================

export interface SupplierProfileResponse {
  id: string;
  organizationId: string;
  businessProfile: BusinessProfileDto;
  registrations: (Omit<RegistrationDto, 'asset'> & {
    asset?: {
      id?: string;
      assetType: string;
      fileName: string;
      contentType: string;
    };
  })[];
  bankAccounts: BankAccountDto[];
  dispatchLocations: DispatchLocationDto[];
}

// ============================================================================
// SUPPLIER PROFILE — CREATE (POST /supplier/register)
// ============================================================================

export interface CreateSupplierProfilePayload {
  organizationId: string | null;
  businessProfile: BusinessProfileDto;
  registrations: RegistrationDto[];
  bankAccounts: BankAccountDto[];
  dispatchLocations: DispatchLocationDto[];
}

// ============================================================================
// SUPPLIER PROFILE — UPDATE REJECTED (PUT /supplier/update-rejected-supplier)
// ============================================================================

export interface UpdateRejectedSupplierPayload {
  supplier: {
    supplierId: string;
    businessProfile: BusinessProfileDto;
    registrations: RegistrationDto[];
    bankAccounts: BankAccountDto[];
    dispatchLocations: DispatchLocationDto[];
  };
}