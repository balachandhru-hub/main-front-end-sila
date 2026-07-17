import platformInstance from './platformInstance';
import type {
  BuyerDto,
  SupplierDto,
  PaginationParamsDto,
  AssetDownloadResponseDto,
} from '../dto/platformDto';

// Re-export DTO types under their existing consumer-facing names so
// components that already import { type Buyer, type Supplier } keep working.
export type {
  BuyerDto as Buyer,
  SupplierDto as Supplier,
  BusinessProfileDto as BusinessProfile,
  RegistrationDto as Registration,
  BankAccountDto as BankAccount,
  DispatchLocationDto as DispatchLocation,
  AssetDto as Asset,
  AssetDownloadResponseDto as AssetDownloadResponse,
  PaginationParamsDto as PaginationParams,
} from '../dto/platformDto';

export const getAllBuyers = async (
  { index, limit }: PaginationParamsDto = { index: 0, limit: 50 }
): Promise<BuyerDto[]> => {
  const response = await platformInstance.post('/api/v1/buyer/get-all-buyer', {
    index,
    limit,
  });
  return response.data;
};

export const getAllSuppliers = async (
  { index, limit }: PaginationParamsDto = { index: 0, limit: 50 }
): Promise<SupplierDto[]> => {
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

export const downloadBuyerAsset = async (assetId: string): Promise<AssetDownloadResponseDto> => {
  try {
    const response = await platformInstance.get(`/api/v1/buyer/asset/${assetId}`);
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to fetch document.';
    throw new Error(`${errMsg} (${status})`);
  }
};

export const downloadSupplierAsset = async (assetId: string): Promise<AssetDownloadResponseDto> => {
  try {
    const response = await platformInstance.get(`/api/v1/supplier/asset/${assetId}`);
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to fetch document.';
    throw new Error(`${errMsg} (${status})`);
  }
};

export const updateBuyerStatus = async (buyerId: string, status: string, comments?: string): Promise<any> => {
  try {
    const response = await platformInstance.put('/api/v1/buyer/status', {
      id: buyerId,
      buyerId,
      status,
      comments: comments || '',
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to update buyer status.';
    throw new Error(`${errMsg} (${status})`);
  }
};

export const updateSupplierStatus = async (supplierId: string, status: string, comments?: string): Promise<any> => {
  try {
    const response = await platformInstance.put('/api/v1/supplier/status', {
      id: supplierId,
      supplierId,
      status,
      comments: comments || '',
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to update supplier status.';
    throw new Error(`${errMsg} (${status})`);
  }
};
