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
    const res = await axiosInstance.get(`/api/v1/masterdata/unspsc?pageIndex=1&pageSize=10`);
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