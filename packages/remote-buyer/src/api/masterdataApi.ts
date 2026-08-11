//src/api/masterdataApi.ts
import axiosInstance from "./axiosInstance";

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

export async function fetchSegments(): Promise<any[]> {
    const res = await axiosInstance.get(`/api/v1/masterdata/unspsc/segment?pageIndex=1&pageSize=10`);
    return Array.isArray(res.data) ? res.data : [];
}

export async function fetchClasses(segment: number, family: number): Promise<any[]> {
    const res = await axiosInstance.get(
        `/api/v1/masterdata/unspsc/class-commodity?segment=${segment}&family=${family}&pageIndex=1&pageSize=10`
    );
    if (Array.isArray(res.data)) {
        return res.data.filter(item => item && item.class !== null && item.title !== "");
    }
    return [];
}

export async function fetchReferenceList(keys: string[]): Promise<any[]> {
    const res = await axiosInstance.post(`/api/v1/masterdata/metadata/reference-list`, keys);
    return Array.isArray(res.data) ? res.data : [];
}

/* ---------------------------------- Countries ---------------------------------- */

export interface CountryDto {
    id: string;
    countryName: string;
    countryCode: string;
    mobileCountryCode: string;
}

export interface CountryListResponseDto {
    items: CountryDto[];
    totalCount: number;
    index: number;
    limit: number;
}

export async function getCountries(
    index: number,
    limit: number,
    searchTerm?: string
): Promise<CountryListResponseDto> {
    const params: Record<string, any> = { index, limit };
    if (searchTerm) params.searchTerm = searchTerm;
    const res = await axiosInstance.get(`/api/v1/masterdata/countries`, { params });
    return res.data;
}

/* ---------------------------------- Units ---------------------------------- */

export interface UnitDto {
    id: string;
    key: string;
    type: string;
    description: string;
}

export interface UnitListResponseDto {
    items: UnitDto[];
    totalCount: number;
    index: number;
    limit: number;
}

export async function getUnits(
    index: number,
    limit: number,
    searchTerm?: string
): Promise<UnitListResponseDto> {
    const params: Record<string, any> = { index, limit };
    if (searchTerm) params.searchTerm = searchTerm;
    const res = await axiosInstance.get(`/api/v1/masterdata/units`, { params });
    return res.data;
}

/* ---------------------------------- Currencies ---------------------------------- */

export interface CurrencyDto {
    id: string;
    currencyName: string;
    sortNumber: number;
}

export interface CurrencyListResponseDto {
    items: CurrencyDto[];
    totalCount: number;
    index: number;
    limit: number;
}

export async function getCurrencies(
    index: number,
    limit: number,
    searchTerm?: string
): Promise<CurrencyListResponseDto> {
    const params: Record<string, any> = { index, limit };
    void searchTerm;
    const res = await axiosInstance.get(`/api/v1/masterdata/currencies`, { params });
    return res.data;
}

// Fetch Families for a selected Segment
export const fetchFamilies = async (
  segment: number,
  payload?: { pageIndex?: number; pageSize?: number }
): Promise<any[]> => {
  try {
    const res = await axiosInstance.get(
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
    console.error('Failed to fetch families:', error);
    return [];
  }
};
 
// Fetch Classes for a selected Family
export const fetchClassifications = async (
  family: number,
  payload?: { pageIndex?: number; pageSize?: number }
): Promise<any[]> => {
  try {
    const res = await axiosInstance.get(
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
    console.error('Failed to fetch classes:', error);
    return [];
  }
};
 
// Fetch Commodities for a selected Class
export const fetchCommodities = async (
  classId: number,
  payload?: { pageIndex?: number; pageSize?: number }
): Promise<any[]> => {
  try {
    const res = await axiosInstance.get(
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
    console.error('Failed to fetch commodities:', error);
    return [];
  }
};
 