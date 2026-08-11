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
export type { CatalogAssetDto, CatalogDetailDto, CreateSupplierCatalogPayload, SubmitRfqAnswersPayload, RfqDocumentAssetDto } from '../dto/supplierDto';

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

export const fetchOnboardingDetails = async (): Promise<any> => {
  try {
    const response = await supplierInstance.get('/api/v1/identity/onboarding');
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'unknown';
    throw new Error(`Failed to fetch onboarding details (${status})`);
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
    const status = error.response?.status || 'unknown';
    throw new Error(`Failed to fetch metadata reference list (${status})`);
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
    const status = error.response?.status || 'unknown';
    throw new Error(`Failed to fetch RFQ master data (${status})`);
  }
};

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