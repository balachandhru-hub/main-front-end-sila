import platformInstance from './platformInstance';
import type { ErrorResponseDto } from '../dto/platformDto';

export interface SelectedProduct {
  segment: number;
  family: number;
  title: string;
}

export interface SelectedSubProduct {
  class: number;
  commodity: number;
  title: string;
  parentSegment?: number;
  parentFamily?: number;
  parentTitle?: string;
}

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
// API: Fetch Segments
// ============================================================================
export async function fetchSegments(): Promise<any[]> {
  try {
    const res = await platformInstance.get(`/api/v1/masterdata/unspsc?pageIndex=1&pageSize=10`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
}

// ============================================================================
// API: Fetch Classes
// ============================================================================
export async function fetchClasses(segment: number, family: number): Promise<any[]> {
  try {
    const res = await platformInstance.get(
      `/api/v1/masterdata/unspsc/class-commodity?segment=${segment}&family=${family}&pageIndex=1&pageSize=10`
    );
    if (Array.isArray(res.data)) {
      return res.data.filter((item) => item && item.class !== null && item.title !== '');
    }
    return [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
}

// ============================================================================
// API: Fetch Reference List
// ============================================================================
export async function fetchReferenceList(keys: string[]): Promise<any[]> {
  try {
    const res = await platformInstance.post(`/api/v1/masterdata/metadata/reference-list`, keys);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error: any) {
    throw extractErrorResponse(error);
  }
}