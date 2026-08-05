import axiosInstance from "./axiosInstance";
import type {
  CreateRFQPayload,
  CreateRFQResponse,
  VerifiedSupplierSearchPayload,
  VerifiedSupplierDto,
  BuyerRFQDetailResponse,
} from "../dto/rfqDto";
import type { UnspscSegmentDto, UnspscFamilyDto } from "../dto/masterDataDto";


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
      '/api/v1/supplier/rfq-verfied-supplier',
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