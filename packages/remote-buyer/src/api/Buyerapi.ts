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
  };
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

// ============================================================================
// API: Get Buyer Profile (Check if profile exists)
// Returns null if 204 No Content (profile not found)
// ============================================================================
export const getBuyerProfile = async (): Promise<BuyerProfileResponse | null> => {
  try {
    const response = await axiosInstance.get<BuyerProfileResponse>('/api/v1/buyer/profile');
    // 204 No Content or empty body → profile doesn't exist
    if (!response.data || Object.keys(response.data).length === 0) {
      return null;
    }
    return response.data;
  } catch (error: any) {
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