import platformInstance from './platformInstance';
import type {
  BuyerDto,
  SupplierDto,
  PaginationParamsDto,
  AssetDownloadResponseDto,
} from '../dto/platformDto';
export interface CreateDepartmentRequestDto {
  organizationId: string;
  department: string;
  buyerId: string;
  costCenter: string[];
}
 
export interface DepartmentResponseDto {
  id?: string;
  organizationId: string;
  department: string;
  buyerId: string;
  costCenter: string[];
  createdAt?: string;
  updatedAt?: string;
}
export interface DepartmentListItemDto {
  id: string;
  department: string;
}

// ─── Cost Center List DTOs ───
export interface CostCenterListItemDto {
  id: string;
  departmentId: string;
  costCenter: string;
}
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

export const updateBuyerInternalStatus = async (organizationId: string, isActive: boolean): Promise<any> => {
  try {
    const response = await platformInstance.put('/api/v1/buyer/internal-status', {
      buyer: {
        organizationId,
        isActive,
      },
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to update buyer internal status.';
    throw new Error(`${errMsg} (${status})`);
  }
};

export const updateSupplierInternalStatus = async (organizationId: string, isActive: boolean): Promise<any> => {
  try {
    const response = await platformInstance.put('/api/v1/supplier/internal-status', {
      supplier: {
        organizationId,
        isActive,
      },
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to update supplier internal status.';
    throw new Error(`${errMsg} (${status})`);
  }
};

export const createBuyerDepartment = async (
  buyerId: string,
  organizationId: string,
  department: string,
  costCenter: string[]
): Promise<DepartmentResponseDto> => {
  try {
    const response = await platformInstance.post(
      `/api/v1/buyer/department?buyerId=${buyerId}`,
      {
        organizationId,
        department,
        buyerId,
        costCenter,
      }
    );
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to create department.';
    throw new Error(`${errMsg} (${status})`);
  }
};

export const getDepartmentsByBuyer = async (
  buyerId: string,
  { index = 0, limit = 50, searchTerm = '' }: { index?: number; limit?: number; searchTerm?: string } = {}
): Promise<DepartmentListItemDto[]> => {
  try {
    const response = await platformInstance.get('/api/v1/buyer/all-department', {
      params: { buyerId, index, limit, searchTerm },
    });
    return response.data;
  } catch (error: any) {
    // Log full error for debugging
    console.error('getDepartmentsByBuyer error:', error);
    console.error('Response:', error.response);
    console.error('Response data:', error.response?.data);
    console.error('Response status:', error.response?.status);
    console.error('Response headers:', error.response?.headers);

    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;

    // Handle different error shapes
    let errMsg = 'Failed to fetch departments.';
    if (typeof responseData === 'string') {
      errMsg = responseData;
    } else if (responseData?.message) {
      errMsg = responseData.message;
    } else if (responseData?.description) {
      errMsg = responseData.description;
    } else if (responseData?.error) {
      errMsg = responseData.error;
    } else if (error.message) {
      errMsg = error.message;
    }

    throw new Error(`${errMsg} (${status})`);
  }
};

export const getCostCentersByDepartment = async (
  departmentId: string,
  { index = 0, limit = 50, searchTerm = '' }: { index?: number; limit?: number; searchTerm?: string } = {}
): Promise<CostCenterListItemDto[]> => {
  try {
    const response = await platformInstance.get('/api/v1/buyer/all-costcenter', {
      params: { departmentId, index, limit, searchTerm },
    });
    return response.data;
  } catch (error: any) {
    console.error('getCostCentersByDepartment error:', error);
    console.error('Response:', error.response);
    console.error('Response data:', error.response?.data);
    console.error('Response status:', error.response?.status);

    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;

    let errMsg = 'Failed to fetch cost centers.';
    if (typeof responseData === 'string') {
      errMsg = responseData;
    } else if (responseData?.message) {
      errMsg = responseData.message;
    } else if (responseData?.description) {
      errMsg = responseData.description;
    } else if (responseData?.error) {
      errMsg = responseData.error;
    } else if (error.message) {
      errMsg = error.message;
    }

    throw new Error(`${errMsg} (${status})`);
  }
};