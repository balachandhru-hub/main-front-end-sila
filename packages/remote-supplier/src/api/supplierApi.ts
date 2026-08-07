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
} from '../dto/supplierDto';

// re-export so existing imports elsewhere (e.g. SupplierApp.tsx) keep working
export type { SupplierProfileResponse, RFQMasterDataItem, RFQDetailResponse, SubmitQuotationPayload } from '../dto/supplierDto';
export type { CatalogAssetDto, CatalogDetailDto, CreateSupplierCatalogPayload, SubmitRfqAnswersPayload, RfqDocumentAssetDto } from '../dto/supplierDto';
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
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    let errMsg = 'Failed to submit supplier profile.';
    if (responseData) {
      errMsg = responseData.message || responseData.description || errMsg;
    }
    throw new Error(`${errMsg} (${status})`);
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
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg =
      responseData?.message ||
      responseData?.description ||
      'Failed to create supplier catalog.';
    throw new Error(`${errMsg} (${status})`);
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
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg =
      responseData?.message ||
      responseData?.description ||
      'Failed to update rejected supplier profile.';
    throw new Error(`${errMsg} (${status})`);
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
    const status = error.response?.status || 'unknown';
    throw new Error(`Failed to fetch onboarding details (${status})`);
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
    const status = error.response?.status || 'unknown';
    throw new Error(`Failed to fetch metadata reference list (${status})`);
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
    throw error;
  }
};

// ============================================================================
// API: Logout Supplier
// ============================================================================
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
    const status = error.response?.status || 'unknown';
    throw new Error(`Failed to fetch RFQ master data (${status})`);
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
    const status = error.response?.status || 'unknown';
    throw new Error(`Failed to fetch RFQ details (${status})`);
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
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to submit quotation.';
    throw new Error(`${errMsg} (${status})`);
  }
};

// ============================================================================
// API: UNSPSC segments and classes for product/sub-product categorization
// ============================================================================
export const fetchSegments = async (): Promise<any[]> => {
  try {
    const res = await supplierInstance.get(`/api/v1/masterdata/unspsc?pageIndex=1&pageSize=10`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error: any) {
    console.error('Failed to fetch segments:', error);
    return [];
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
    console.error('Failed to fetch classes:', error);
    return [];
  }
};

export const submitRfqAnswers = async (
  payload: SubmitRfqAnswersPayload
): Promise<any> => {
  try {
    const response = await supplierInstance.put('/api/v1/supplier/rfq-answer', payload);
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data;
    const errMsg = responseData?.message || responseData?.description || 'Failed to submit RFQ answers.';
    throw new Error(`${errMsg} (${status})`);
  }
};