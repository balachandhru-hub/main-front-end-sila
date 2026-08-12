import axiosInstance from "./axiosInstance";
import type {
  CreateRFQPayload,
  CreateRFQResponse,
  VerifiedSupplierSearchPayload,
  VerifiedSupplierDto,
  BuyerRFQDetailResponse,
} from "../dto/rfqDto";
import type { UnspscSegmentDto, UnspscFamilyDto } from "../dto/masterDataDto";

export interface BuyerCatalogResponse {
  supplierId: string;
  catalogId: string;
  supplierName: string;
  catalogName: string;
  description: string;
  price: number;
  currency: string;
  unitOfMeasure: string;
  segment: number;
  segmentTitle: string;
  family: number;
  familyTitle: string;
  commodity: number;
  commodityTitle: string;
  class: number;
  classTitle: string;
  catalogType: string;
  isPunchOut: boolean;
  punchOutUrl: string;
  hasCatalog: boolean;
}
import type { ErrorResponseDto } from "@vosox/shared-ui";
import { isErrorResponse } from "@vosox/shared-ui";

export interface BuyerProfileResponse {
  id: string;
  organizationId: string;
  businessProfile: {
    organizationName: string;
    email: string;
    phone: string;
    country: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pinCode: string;
    industry: string;
    businessType: string;
    employeeCount: number;
    annualTurnover: number;
    currency: string;
    yearEstablished: number;
    website: string;
    description: string;
    status: string;
  };
  categories?: {
    segment: number;
    segmentTitle: string;
    family: number;
    familyTitle: string;
    class: number;
    classTitle: string;
    commodity: number;
    commodityTitle: string;
  }[];
  buyerCategories?: {
    segment: number;
    segmentTitle: string;
    family: number;
    familyTitle: string;
    class: number;
    classTitle: string;
    commodity: number;
    commodityTitle: string;
  }[];
  registrations: {
    registrationType: string;
    registrationNumber: string;
    registrationName: string;
    asset: {
      id: string;
      assetType: string;
      assetName: string;
      fileType: string;
      fileName: string;
    };
    expiryDate: string;
  }[];
  bankAccounts: {
    accountHolderName: string;
    bankName: string;
    branchName: string;
    accountNumber: string;
    ifscCode: string;
    swiftCode: string;
    currency: string;
    isPrimary: boolean;
    isVerified: boolean;
  }[];
  dispatchLocations: {
    locationName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
    contactPerson: string;
    contactPhone: string;
    isDefault: boolean;
  }[];
}

export interface OnboardingResponse {
  id: string;
  organizationName: string;
  organizationType: string;
  email: string;
  phone: string;
  country: string;
  emailVerified: boolean;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
}

export interface BuyerRegistrationPayload {
  organizationId: string;
  organizationName: string;
  email: string;
  phone: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  industry: string;
  businessType: string;
  employeeCount: number;
  annualTurnover: number;
  currency: string;
  yearEstablished: number;
  website: string;
  description: string;
  status: string;
  buyerCategories: {
    segment: number;
    segmentTitle: string;
    family: number;
    familyTitle: string;
    class: number;
    classTitle: string;
    commodity: number;
    commodityTitle: string;
  }[];
  buyerBankAccounts: {
    accountHolderName: string;
    bankName: string;
    branchName: string;
    accountNumber: string;
    ifscCode: string;
    swiftCode: string;
    currency: string;
    isPrimary: boolean;
  }[];
  buyerDocumentRegistrations: {
    registrationNumber: string;
    registrationName: string;
    expiryDate: string | null;
    registrationType: string;
    registrationDocument: {
      entityType: string;
      entityId: string;
      assetType: string;
      fileBytes: string;
      fileName: string;
      contentType: string;
      isSingletonAsset: boolean;
      id?: string;
    };
  }[];
  buyerDeliveryLocations: {
    locationName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
    contactPerson: string;
    contactPhone: string;
    isDefault: boolean;
  }[];
}

export interface PersonDetailDto {
  personId: string;
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  userName: string;
  addressLine: string;
  country: string;
  roleId: string;
  roleName: string;
  organizationName: string;
  organizationEmail: string;
}

export interface UpdateRejectedBuyerPayload {
  buyer: {
    buyerId: string;
    businessProfile: {
      organizationId: string;
      organizationName: string;
      email: string;
      phone: string;
      country: string;
      addressLine1: string;
      addressLine2: string;
      city: string;
      state: string;
      pinCode: string;
      industry: string;
      businessType: string;
      employeeCount: number;
      annualTurnover: number;
      currency: string;
      yearEstablished: number;
      website: string;
      description: string;
      status: string;
    };
    buyerCategories: (BuyerRegistrationPayload['buyerCategories'][0] & { id?: string })[];
    buyerBankAccounts: (BuyerRegistrationPayload['buyerBankAccounts'][0] & { id?: string })[];
    buyerDocumentRegistrations: (BuyerRegistrationPayload['buyerDocumentRegistrations'][0] & { id?: string })[];
    buyerDeliveryLocations: (BuyerRegistrationPayload['buyerDeliveryLocations'][0] & { id?: string })[];
  };
}


export const getBuyerProfile = async (): Promise<BuyerProfileResponse | null> => {
  try {
    const response = await axiosInstance.get<BuyerProfileResponse>('/api/v1/buyer/profile');

    if (response.status === 204 || !response.data || Object.keys(response.data).length === 0) {
      return null;
    }

    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 204) {
      return null;
    }

    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch buyer profile (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};


export const getOnboardingDetails = async (): Promise<OnboardingResponse> => {
  try {
    const response = await axiosInstance.get<OnboardingResponse>('/api/v1/identity/onboarding');
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch onboarding details (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};


export const createBuyerProfile = async (payload: BuyerRegistrationPayload): Promise<any> => {
  try {
    const response = await axiosInstance.post('/api/v1/buyer/register', payload);
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to create buyer profile (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};

export const updateBuyerProfile = async (payload: BuyerRegistrationPayload): Promise<any> => {
  try {
    const response = await axiosInstance.put('/api/v1/buyer/profile', payload);
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to update buyer profile (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};


export const updateRejectedBuyer = async (payload: UpdateRejectedBuyerPayload): Promise<any> => {
  try {
    const response = await axiosInstance.put('/api/v1/buyer/update-rejected-buyer', payload);
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to update rejected buyer profile (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};


export const logoutBuyer = async (): Promise<void> => {
  try {
    await axiosInstance.put('/api/v1/identity/auth/logout');
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to logout.';
    throw new Error(`${errMsg} (${status})`);
  } finally {
    invalidatePersonDetailCache();
  }
};


export const getAllDepartments = async (buyerId: string, index = 0, limit = 10, searchTerm?: string): Promise<any> => {
  try {
    let url = `/api/v1/buyer/all-department?buyerId=${buyerId}&index=${index}&limit=${limit}`;
    if (searchTerm) {
      url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
    }
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch departments (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};


export const getAllCostCenters = async (departmentId: string, index = 0, limit = 10, searchTerm?: string): Promise<any> => {
  try {
    let url = `/api/v1/buyer/all-costcenter?departmentId=${departmentId}&index=${index}&limit=${limit}`;
    if (searchTerm) {
      url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
    }
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch cost centers (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};


export const getAllItemMasters = async (buyerId: string, index = 0, limit = 10, searchTerm?: string): Promise<any> => {
  try {
    let url = `/api/v1/buyer/item-master?buyerId=${buyerId}&index=${index}&limit=${limit}`;
    if (searchTerm) {
      url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
    }
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch item masters (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};


export const createRFQ = async (payload: CreateRFQPayload): Promise<CreateRFQResponse> => {
  try {
    const response = await axiosInstance.post<CreateRFQResponse>('/api/v1/buyer/createrfq', payload);
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to create RFQ (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};


export const getVerifiedSuppliers = async (
  payload: VerifiedSupplierSearchPayload
): Promise<VerifiedSupplierDto[]> => {
  try {
    const response = await axiosInstance.post<VerifiedSupplierDto[]>(
      '/api/v1/supplier/rfq-supplier',
      payload
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch suppliers (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};

export const getUnspscSegments = async (
  pageIndex = 1,
  pageSize = 100,
  searchTerm?: string
): Promise<UnspscSegmentDto[]> => {
  try {
    let url = `/api/v1/masterdata/unspsc/segment?pageIndex=${pageIndex}&pageSize=${pageSize}`;
    if (searchTerm) {
      url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
    }
    const response = await axiosInstance.get<UnspscSegmentDto[]>(url);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch segments (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};


export const getUnspscFamilies = async (
  segment: number,
  pageIndex = 1,
  pageSize = 100
): Promise<UnspscFamilyDto[]> => {
  try {
    const url = `/api/v1/masterdata/unspsc/family?segment=${segment}&pageIndex=${pageIndex}&pageSize=${pageSize}`;
    const response = await axiosInstance.get<UnspscFamilyDto[]>(url);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch families (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};


export const fetchBuyerRFQs = async (payload: { buyerId: string; index: number; limit: number }): Promise<any[]> => {
  try {
    const response = await axiosInstance.post<any[]>('/api/v1/buyer/rfq-master-data', payload);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch RFQs (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};

export const fetchBuyerRFQById = async (rfqId: string): Promise<BuyerRFQDetailResponse> => {
  try {
    const response = await axiosInstance.get<BuyerRFQDetailResponse>('/api/v1/buyer/rfq-by-id', {
      params: { rfqId },
    });
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch RFQ details (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};

export const fetchBuyerCatalog = async (payload: {
  segment?: number;
  family?: number;
  class?: number;
  commodity?: number;
  search?: string;
  index?: number;
  limit?: number;
}): Promise<BuyerCatalogResponse[] | ErrorResponseDto> => {
  try {
    const response = await axiosInstance.get<BuyerCatalogResponse[]>(
      '/api/v1/supplier/buyer-catalog',
      {
        params: {
          segment: payload.segment || undefined,
          family: payload.family || undefined,
          class: payload.class || undefined,
          commodity: payload.commodity || undefined,
          search: payload.search || undefined,
          index: payload.index ?? 0,
          limit: payload.limit ?? 20,
        },
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    if (error.response?.status === 401) {
      (window as any).handleUnauthorized?.();
      return {
        statusCode: 401,
        message: 'Unauthorized',
        description: 'You are not authorized to access this resource. Please login again.',
      };
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || 'Failed to fetch buyer catalog',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: 'Something went wrong while fetching buyer catalog.',
    };
  }
};

export const getPersonDetail = async (): Promise<PersonDetailDto | ErrorResponseDto> => {
  try {
    const response = await axiosInstance.get<PersonDetailDto>(
      '/api/v1/identity/person-detail'
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      (window as any).handleUnauthorized?.();
      return {
        statusCode: 401,
        message: 'Unauthorized',
        description: 'You are not authorized to access this resource. Please login again.',
      };
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || 'Failed to fetch person details',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: 'Something went wrong while fetching person details.',
    };
  }
};


export const updatePersonDetail = async (
  data: Partial<PersonDetailDto>
): Promise<PersonDetailDto | ErrorResponseDto> => {
  try {
    const response = await axiosInstance.put<PersonDetailDto>(
      '/api/v1/identity/person-detail',
      data
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      (window as any).handleUnauthorized?.();
      return {
        statusCode: 401,
        message: 'Unauthorized',
        description: 'You are not authorized to perform this action. Please login again.',
      };
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
        message: errData.message || 'Failed to update person details',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: 'Something went wrong while updating person details.',
    };
  }
};


let personDetailCache: PersonDetailDto | null = null;
let personDetailInFlight: Promise<PersonDetailDto | ErrorResponseDto> | null = null;

export const getPersonDetailCached = async (): Promise<PersonDetailDto | ErrorResponseDto> => {
  if (personDetailCache) return personDetailCache;
  if (personDetailInFlight) return personDetailInFlight;

  personDetailInFlight = getPersonDetail().then((result) => {
    if (!isErrorResponse(result)) {
      personDetailCache = result;
    }
    personDetailInFlight = null;
    return result;
  });

  return personDetailInFlight;
};

export const invalidatePersonDetailCache = () => {
  personDetailCache = null;
};

export interface BuyerAssetDownloadResponse {
  assetId: string;
  fileName: string;
  contentType: string;
  fileBytes: string;
}

export const downloadBuyerAsset = async (assetId: string): Promise<BuyerAssetDownloadResponse> => {
  try {
    const response = await axiosInstance.get<BuyerAssetDownloadResponse>(`/api/v1/supplier/asset/${assetId}`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to download document (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};