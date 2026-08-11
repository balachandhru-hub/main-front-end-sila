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
  ErrorResponseDto,
} from '../dto/supplierDto';

// re-export so existing imports elsewhere (e.g. SupplierApp.tsx) keep working
export type { SupplierProfileResponse, RFQMasterDataItem, RFQDetailResponse, SubmitQuotationPayload } from '../dto/supplierDto';
export type { CatalogAssetDto, CatalogDetailDto, CreateSupplierCatalogPayload, SubmitRfqAnswersPayload, RfqDocumentAssetDto, SupplierCatalogListItem } from '../dto/supplierDto';
export type { ErrorResponseDto } from '../dto/supplierDto';

// ============================================================================
// HELPER: Extract Error Response
// ============================================================================
const extractErrorResponse = (error: any): ErrorResponseDto => {
  const responseData = error.response?.data;
  return {
    status_code: error.response?.status || 500,
    message: responseData?.message || 'An error occurred',
    description: responseData?.description || responseData?.message || 'An error occurred',
  };
};

// ============================================================================
// API: Create Supplier Profile (Register)
// ============================================================================
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

// ============================================================================
// API: Create Supplier Catalog
// ============================================================================
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

// ============================================================================
// API: Update Rejected Supplier (resubmission after REJECTED status)
// ============================================================================
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

// ============================================================================
// API: Get Onboarding Details (Auto-fill company info)
// ============================================================================
export const fetchOnboardingDetails = async (): Promise<any> => {
  try {
    const response = await supplierInstance.get('/api/v1/identity/onboarding');
    return response.data;
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

// ============================================================================
// API: Get Metadata Reference List (Industry / Business Type / Document Type / Entity Type)
// ============================================================================
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

// ============================================================================
// API: Get Supplier Profile (Check if profile exists)
// Returns null if 204 No Content (profile not found)
// ============================================================================
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

// ============================================================================
// API: Logout Supplier
// ============================================================================
export const logoutSupplier = async (): Promise<void> => {
  try {
    await supplierInstance.put('/api/v1/identity/auth/logout');
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
};

// ============================================================================
// API: Get RFQ Master Data (Recent Sourcing Opportunities)
// ============================================================================
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

// ============================================================================
// API: Get RFQ By ID
// ============================================================================
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

// ============================================================================
// API: Submit Supplier Quotation (Create/Update Quotation)
// ============================================================================
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

// ============================================================================
// API: UNSPSC segments and classes for product/sub-product categorization
// ============================================================================
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