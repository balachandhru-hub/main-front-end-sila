// DTOs mirroring the exact shape returned by the platform API
// (POST /api/v1/buyer/getAllbuyer, POST /api/v1/supplier/get-all-supplier,
//  GET /api/v1/buyer/asset/{assetId}, GET /api/v1/supplier/asset/{assetId})

export interface AssetDto {
  id?: string;
  assetType?: string | null;
  assetName?: string;
  fileType?: string | null;
  fileName?: string;
}

export interface RegistrationDto {
  registrationType?: string;
  registrationNumber?: string;
  registrationName?: string;
  asset?: AssetDto;
  expiryDate?: string | null;
}

export interface BankAccountDto {
  accountHolderName?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  swiftCode?: string;
  iban?: string;
  currency?: string;
  isPrimary?: boolean;
  isVerified?: boolean;
}

export interface DispatchLocationDto {
  locationName?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  isDefault?: boolean;
}

export interface BusinessProfileDto {
  organizationName?: string;
  email?: string;
  phone?: string;
  emailVerified?: boolean;
  country?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  industry?: string;
  businessType?: string;
  employeeCount?: number;
  annualTurnover?: number;
  currency?: string;
  yearEstablished?: number;
  website?: string;
  description?: string;
}

export interface BuyerDto {
  id: string;
  organizationId: string;
  businessProfile?: BusinessProfileDto;
  registrations?: RegistrationDto[];
  bankAccounts?: BankAccountDto[];
  dispatchLocations?: DispatchLocationDto[];
}

export interface SupplierDto {
  id: string;
  organizationId: string;
  businessProfile?: BusinessProfileDto;
  registrations?: RegistrationDto[];
  bankAccounts?: BankAccountDto[];
  dispatchLocations?: DispatchLocationDto[];
}

export interface PaginationParamsDto {
  index: number;
  limit: number;
}

export interface AssetDownloadResponseDto {
  assetId: string;
  fileName: string;
  contentType: string;
  fileBytes: string; // base64-encoded file content
}

export type PlatformEntityType = 'buyers' | 'suppliers';
export type PlatformRecordDto = BuyerDto | SupplierDto;