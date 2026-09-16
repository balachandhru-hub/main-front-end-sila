import platformInstance from './platformInstance';
import type {
  BuyerDto,
  SupplierDto,
  PaginationParamsDto,
  AssetDownloadResponseDto,
  ErrorResponseDto,
} from '../dto/platformDto';
import { invalidatePersonDetailCache } from './networkAdminApi';
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

export interface CostCenterListItemDto {
  id: string;
  departmentId: string;
  costCenter: string;
}

/* ---------------------------------- Bid Comparison DTOs ---------------------------------- */

export type BidValueType = 'AMOUNT' | 'PERCENTAGE';

export interface BidQuotationItemDto {
  supplierQuotationItemId: string;
  supplierRFQItemId: string;
  buyerRFQItemId: string;
  version: string;
  quotedPrice: number;
  quotedAmount: number;
  subTotal: number;
  lineNumber: number;
  deliveryCharge: number | null;
  tax: number | null;
  discount: number | null;
  deliveryType: BidValueType | null;
  discountType: BidValueType | null;
  taxType: BidValueType | null;
}

export interface BidQuotationVersionDto {
  supplierRFQId: string;
  quotationId: string;
  version: string;
  totalPrice: number;
  deliveryCharge: number;
  tax: number;
  discount: number;
  deliveryType: BidValueType;
  discountType: BidValueType;
  taxType: BidValueType;
  status: string;
  items: BidQuotationItemDto[];
}

export interface BidSupplierQuotationDto {
  supplierId: string;
  supplierName: string;
  firstVersion: BidQuotationVersionDto;
  latestVersion: BidQuotationVersionDto;
}

export interface BidRfqItemDto {
  id: string;
  description: string;
  quantity: number;
  uom: string;
  materialCode: string;
  materialGroup: string;
  costCenter: string;
  lineNumber: number;
}

export interface BidComparisonResponseDto {
  rfqId: string;
  rfqNumber: string;
  addLotOption: boolean;
  suppliers: BidSupplierQuotationDto[];
  rfqItems: BidRfqItemDto[];
}

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
  } finally {
    invalidatePersonDetailCache();
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
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;

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

export const getSupplierProfileByOrgId = async (organizationId: string): Promise<SupplierDto> => {
  try {
    const response = await platformInstance.get('/api/v1/supplier/profile', {
      params: { organizationId },
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 405 || error.response?.status === 400 || error.response?.status === 404) {
      const postResponse = await platformInstance.post('/api/v1/supplier/profile', { organizationId });
      return postResponse.data;
    }
    throw error;
  }
};

export const getBuyerProfileByOrgId = async (organizationId: string): Promise<BuyerDto> => {
  try {
    const response = await platformInstance.get('/api/v1/buyer/profile', {
      params: { organizationId },
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 405 || error.response?.status === 400 || error.response?.status === 404) {
      const postResponse = await platformInstance.post('/api/v1/buyer/profile', { organizationId });
      return postResponse.data;
    }
    throw error;
  }
};

export const isBidComparisonError = (
  data: BidComparisonResponseDto | ErrorResponseDto
): data is ErrorResponseDto => !!data && 'status_code' in data;

export const getBidComparisonData = async (
  rfqId: string
): Promise<BidComparisonResponseDto | ErrorResponseDto> => {
  try {
    const response = await platformInstance.get<BidComparisonResponseDto>('/api/v1/buyer/bid-compare', {
      params: { rfqId },
    });
    return {
      ...response.data,
      suppliers: response.data?.suppliers || [],
      rfqItems: response.data?.rfqItems || [],
    };
  } catch (error: any) {
    if (error.response?.status === 401) {
      (window as any).handleUnauthorized?.();
      return {
        status_code: 401,
        message: 'Unauthorized',
        description: 'You are not authorized to access this resource. Please login again.',
      };
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        status_code: errData.status_code || errData.statusCode || error.response.status || 500,
        message: errData.message || 'Failed to fetch bid comparison data',
        description: errData.description || 'No details provided',
      };
    }

    return {
      status_code: 500,
      message: 'Unexpected Error',
      description: 'Something went wrong while fetching bid comparison data.',
    };
  }
};

export const getTokenClaims = async (skipRefresh = false) => {
  const response = await platformInstance.get('/api/v1/identity/token-claim', {
    ...({ _skipRefresh: skipRefresh } as any),
  });
  return response.data;
};

export interface BuyerAssetDto {
  fileName?: string;
  fileType?: string;
  contentType?: string;
  fileBytes?: string;
  url?: string;
  fileUrl?: string;
}

export interface AssetErrorDto {
  statusCode: number;
  message: string;
  description: string;
}

export const fetchBuyerAsset = async (
  assetId: string
): Promise<BuyerAssetDto | AssetErrorDto> => {
  try {
    try {
      const response = await platformInstance.get<BuyerAssetDto>(
        `/api/v1/buyer/asset/${assetId}`
      );
      if (response.data) return response.data;
    } catch (e) {
      // fallback to supplier asset endpoint
    }

    const response = await platformInstance.get<BuyerAssetDto>(
      `/api/v1/supplier/asset/${assetId}`
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
        message: errData.message || 'Failed to fetch asset',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: 'Something went wrong while fetching the asset.',
    };
  }
};