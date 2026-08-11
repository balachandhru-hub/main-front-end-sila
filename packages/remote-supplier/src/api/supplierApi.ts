import supplierInstance from './supplierInstance';
import type {
  SupplierProfileResponse,
  UpdateRejectedSupplierPayload,
  CreateSupplierProfilePayload,
  MetadataReferenceItem,
  MetadataReferenceType,
  RFQMasterDataItem,
  RFQDetailResponse,
  SubmitQuotationPayload,
  CreateSupplierCatalogPayload,
  SubmitRfqAnswersPayload,
  CurrencyListResponse,
  SupplierCatalogListItem,
} from '../dto/supplierDto';
import type { ErrorResponseDto } from '@vosox/shared-ui';
import { isErrorResponse } from '@vosox/shared-ui';

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

export type { SupplierProfileResponse, RFQMasterDataItem, RFQDetailResponse, SubmitQuotationPayload } from '../dto/supplierDto';
export type { CatalogAssetDto, CatalogDetailDto, CreateSupplierCatalogPayload, SubmitRfqAnswersPayload, RfqDocumentAssetDto, SupplierCatalogListItem } from '../dto/supplierDto';
export type { ErrorResponseDto } from '../dto/supplierDto';

// ============================================================================
// HELPER: Extract Error Response
// ============================================================================
const extractErrorResponse = (error: any): ErrorResponseDto => {
  const responseData = error.response?.data;
  return {
    statusCode: error.response?.status || 500,
    message: responseData?.message || 'An error occurred',
    description: responseData?.description || responseData?.message || 'An error occurred',
  };
};

export const createSupplierProfile = async (
  payload: CreateSupplierProfilePayload
): Promise<any> => {
  try {
    const response = await supplierInstance.post('/api/v1/supplier/register', payload);
    return response;
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

export const createSupplierCatalog = async (
  payload: CreateSupplierCatalogPayload
): Promise<any> => {
  try {
    const response = await supplierInstance.post('/api/v1/supplier/catalog', payload);
    return response.data;
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

export const updateRejectedSupplier = async (
  payload: UpdateRejectedSupplierPayload
): Promise<any> => {
  try {
    const response = await supplierInstance.put(
      '/api/v1/supplier/update-rejected-supplier',
      payload
    );
    return response.data;
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

export const fetchOnboardingDetails = async (): Promise<any> => {
  try {
    const response = await supplierInstance.get('/api/v1/identity/onboarding');
    return response.data;
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

export const fetchMetadataReferenceList = async (
  types: MetadataReferenceType[]
): Promise<MetadataReferenceItem[]> => {
  try {
    const response = await supplierInstance.post<MetadataReferenceItem[]>(
      '/api/v1/masterdata/metadata/reference-list',
      types
    );
    return response.data ?? [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

export const getSupplierProfile = async (): Promise<SupplierProfileResponse | null> => {
  try {
    const response = await supplierInstance.get<SupplierProfileResponse>(
      'api/v1/supplier/profile'
    );

    if (response.status === 204 || !response.data || Object.keys(response.data).length === 0) {
      return null;
    }

    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 204) {
      return null;
    }
    throw extractErrorResponse(error);
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
  } finally {
    invalidatePersonDetailCache();
  }
};

export const fetchRFQMasterData = async (payload: {
  supplierId: string;
  index: number;
  limit: number;
}): Promise<RFQMasterDataItem[]> => {
  try {
    const response = await supplierInstance.post('/api/v1/supplier/rfq-master-data', payload);
    return response.data ?? [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

export const fetchRFQById = async (rfqId: string): Promise<RFQDetailResponse> => {
  try {
    const response = await supplierInstance.get('/api/v1/supplier/rfq-by-id', {
      params: { rfqId },
    });
    return response.data;
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

export const submitSupplierQuotation = async (
  payload: SubmitQuotationPayload
): Promise<any> => {
  try {
    const response = await supplierInstance.put('/api/v1/supplier/quotation', payload);
    return response.data;
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

export const fetchSegments = async (): Promise<any[]> => {
  try {
    const res = await supplierInstance.get(`/api/v1/masterdata/unspsc/segment?pageIndex=1&pageSize=10`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

export const fetchClasses = async (segment: number, family: number): Promise<any[]> => {
  try {
    const res = await supplierInstance.get(
      `/api/v1/masterdata/unspsc/class-commodity?segment=${segment}&family=${family}&pageIndex=1&pageSize=10`
    );
    if (Array.isArray(res.data)) {
      return res.data.filter((item) => item && item.class !== null && item.title !== '');
    }
    return [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

// ============================================================================
// API: Submit RFQ Answers
// ============================================================================
export const submitRfqAnswers = async (
  payload: SubmitRfqAnswersPayload
): Promise<any> => {
  try {
    const response = await supplierInstance.put('/api/v1/supplier/rfq-answer', payload);
    return response.data;
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

// ============================================================================
// API: Fetch Currencies
// ============================================================================
export const fetchCurrencies = async (payload?: {
  index?: number;
  limit?: number;
}): Promise<CurrencyListResponse> => {
  try {
    const response = await supplierInstance.get<CurrencyListResponse>(
      '/api/v1/masterdata/currencies',
      {
        params: {
          index: payload?.index ?? 0,
          limit: payload?.limit ?? 10,
        },
      }
    );
    return response.data ?? { items: [], totalCount: 0, index: 0, limit: 0 };
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

// ============================================================================
// API: Fetch Families for a selected Segment
// ============================================================================
export const fetchFamilies = async (
  segment: number,
  payload?: { pageIndex?: number; pageSize?: number }
): Promise<any[]> => {
  try {
    const res = await supplierInstance.get(
      `/api/v1/masterdata/unspsc/family`,
      {
        params: {
          segment,
          pageIndex: payload?.pageIndex ?? 1,
          pageSize: payload?.pageSize ?? 100,
        },
      }
    );
    if (Array.isArray(res.data)) {
      return res.data.filter((item) => item && item.family !== null && item.title !== '');
    }
    return [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

// ============================================================================
// API: Fetch Classes for a selected Family
// ============================================================================
export const fetchClassifications = async (
  family: number,
  payload?: { pageIndex?: number; pageSize?: number }
): Promise<any[]> => {
  try {
    const res = await supplierInstance.get(
      `/api/v1/masterdata/unspsc/class`,
      {
        params: {
          family,
          pageIndex: payload?.pageIndex ?? 1,
          pageSize: payload?.pageSize ?? 100,
        },
      }
    );
    if (Array.isArray(res.data)) {
      return res.data.filter((item) => item && item.class !== null && item.title !== '');
    }
    return [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

// ============================================================================
// API: Fetch Commodities for a selected Class
// ============================================================================
export const fetchCommodities = async (
  classId: number,
  payload?: { pageIndex?: number; pageSize?: number }
): Promise<any[]> => {
  try {
    const res = await supplierInstance.get(
      `/api/v1/masterdata/unspsc/commodity`,
      {
        params: {
          class: classId,
          pageIndex: payload?.pageIndex ?? 1,
          pageSize: payload?.pageSize ?? 100,
        },
      }
    );
    if (Array.isArray(res.data)) {
      return res.data.filter((item) => item && item.commodity !== null && item.title !== '');
    }
    return [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

// ============================================================================
// API: Fetch Supplier Catalog
// ============================================================================
export const fetchSupplierCatalog = async (): Promise<SupplierCatalogListItem[]> => {
  try {
    const response = await supplierInstance.get<SupplierCatalogListItem[]>('/api/v1/supplier/catalog');
    return response.data ?? [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

export const getPersonDetail = async (): Promise<PersonDetailDto | ErrorResponseDto> => {
  try {
    const response = await supplierInstance.get<PersonDetailDto>(
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
    const response = await supplierInstance.put<PersonDetailDto>(
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