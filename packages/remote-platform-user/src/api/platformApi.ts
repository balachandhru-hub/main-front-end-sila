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
  // Fallbacks if shape is flattened
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
  // Fallbacks if shape is flattened
  organizationName?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  state?: string;
  industry?: string;
  businessType?: string;
}

export const getAllBuyers = async (): Promise<Buyer[]> => {
  const response = await platformInstance.get('/api/v1/buyer/getAllbuyer');
  return response.data;
};

export const getAllSuppliers = async (): Promise<Supplier[]> => {
  const response = await platformInstance.get('/api/v1/supplier/getAllSupplier');
  return response.data;
};
