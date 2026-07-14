import supplierInstance from './supplierInstance';

export const createSupplierProfile = async (payload: any): Promise<any> => {
  try {
    const response = await supplierInstance.post('/api/v1/supplier/register', payload);
    return response;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    let errMsg = 'Failed to submit supplier profile.';
    if (responseData) {
      errMsg = responseData.message || responseData.description || errMsg;
    }
    throw new Error(`${errMsg} (${status})`);
  }
};

export const fetchOnboardingDetails = async (): Promise<any> => {
  try {
    const response = await supplierInstance.get('/api/v1/identity/onboarding');
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    throw new Error(`Failed to fetch onboarding details (${status})`);
  }
};

export const getSupplierProfile = async (): Promise<any> => {
  try {
    const response = await supplierInstance.get('api/v1/supplier/profile');
    if (response.status === 204 || !response.data || Object.keys(response.data).length === 0) {
      return null;
    }
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const logoutSupplier = async (): Promise<void> => {
  try {
    await supplierInstance.put('/api/v1/identity/auth/logout');
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to logout.';
    throw new Error(`${errMsg} (${status})`);
  }
};