import axiosInstance from "./axiosInstance";

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// API: Get Buyer Profile (Check if profile exists)
// Returns null if 204 No Content (profile not found)
// ============================================================================
export const getBuyerProfile = async (): Promise<BuyerProfileResponse | null> => {
  try {
    const response = await axiosInstance.get<BuyerProfileResponse>('/api/v1/buyer/profile');

    // If status is 204 No Content, profile doesn't exist
    if (response.status === 204 || !response.data || Object.keys(response.data).length === 0) {
      return null;
    }

    // If status is 200, profile exists
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 204) {
      return null;
    }

    // Any error (404, 429, 500, etc.) → throw to be handled by caller
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data?.message || data?.description || `Failed to fetch buyer profile (${error.response.status}).`);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
};

// ============================================================================
// API: Get Onboarding Details (Auto-fill delivery location)
// ============================================================================
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

// ============================================================================
// API: Create Buyer Profile (Register)
// ============================================================================
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

// ============================================================================
// API: Update Buyer Profile
// ============================================================================
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

// ============================================================================
// API: Update Rejected Buyer
// ============================================================================
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

// ============================================================================
// API: Logout Buyer
// ============================================================================
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

// ============================================================================
// API: Get All Departments
// ============================================================================
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

// ============================================================================
// API: Get All Cost Centers
// ============================================================================
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

// ============================================================================
// API: Get Item Buyer Master
// ============================================================================
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