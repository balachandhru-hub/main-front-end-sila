import platformInstance from './platformInstance';

export interface BusinessProfile {
  organizationName?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  industry?: string;
  businessType?: string;
  description?: string;
  website?: string;
}

export interface Buyer {
  organizationId: string;
  businessProfile?: BusinessProfile;
  organizationName?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  state?: string;
  industry?: string;
  businessType?: string;
}

export interface Supplier {
  organizationId: string;
  businessProfile?: BusinessProfile;
  organizationName?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  state?: string;
  industry?: string;
  businessType?: string;
}

export interface PaginationParams {
  index: number;
  limit: number;
}

export const getAllBuyers = async (
  { index, limit }: PaginationParams = { index: 0, limit: 50 }
): Promise<Buyer[]> => {
  const response = await platformInstance.post('/api/v1/buyer/getAllbuyer', {
    index,
    limit,
  });
  return response.data;
};

export const getAllSuppliers = async (
  { index, limit }: PaginationParams = { index: 0, limit: 50 }
): Promise<Supplier[]> => {
  const response = await platformInstance.post('/api/v1/supplier/get-all-supplier', {
    index,
    limit,
  });
  return response.data;
};

export const logoutPlatformUser = async (): Promise<void> => {
  try {
    await platformInstance.put('/api/v1/identity/auth/logout');
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to logout.';
    throw new Error(`${errMsg} (${status})`);
  }
};