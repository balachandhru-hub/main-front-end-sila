import axios from "axios";
import axiosInstance from "./axiosInstance";

export interface Outlet {
  id: string;
  outletName: string;
  outletCode?: string | null;
  description?: string | null;
  externalShipTo?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface OutletWrite {
  outletName: string;
  outletCode?: string | null;
  description?: string | null;
  externalShipTo?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface WishlistItemWrite {
  materialId: string;
  quantity: number;
  unitPrice?: number | null;
  currency?: string | null;
  requiredDate?: string | null;
}

export interface WishlistWrite {
  outletId: string;
  wishlistName: string;
  description?: string | null;
  supplierOrganizationId?: string | null;
  supplierName?: string | null;
  masterApprovalFlowId?: string | null;
  currency?: string | null;
  deliveryInstruction?: string | null;
  requiredDate?: string | null;
  items: WishlistItemWrite[];
}

export interface WishlistItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unitOfMeasure?: string | null;
  quantity: number;
  unitPrice?: number | null;
  currency?: string | null;
  requiredDate?: string | null;
}

export interface WishlistApprovalStep {
  userId: string;
  order: number;
  status: string;
  comment?: string | null;
  actedOn?: string | null;
}

export interface WishlistListItem {
  id: string;
  wishlistName: string;
  outletName?: string | null;
  createdBy: string;
  dateCreated: string;
  status: string;
  approvalName?: string | null;
  buyerErpDocumentNumber?: string | null;
  supplierErpDocumentNumber?: string | null;
  lastError?: string | null;
}

export interface WishlistDetail {
  id: string;
  buyerOrganizationId: string;
  buyerId: string;
  outletId: string;
  outletName?: string | null;
  wishlistName: string;
  description?: string | null;
  supplierOrganizationId?: string | null;
  supplierName?: string | null;
  status: string;
  masterApprovalFlowId?: string | null;
  approvalName?: string | null;
  createdBy: string;
  dateCreated: string;
  updatedBy: string;
  dateUpdated: string;
  submittedOn?: string | null;
  finalApprovedOn?: string | null;
  buyerErpDocumentType?: string | null;
  buyerErpDocumentNumber?: string | null;
  supplierErpDocumentNumber?: string | null;
  currency?: string | null;
  deliveryInstruction?: string | null;
  requiredDate?: string | null;
  lastError?: string | null;
  isFrozen: boolean;
  items: WishlistItem[];
  approvalSteps: WishlistApprovalStep[];
}

const readError = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; description?: string } | undefined;
    return data?.description || data?.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const getOutlets = async (): Promise<Outlet[]> => {
  try {
    const response = await axiosInstance.get<Outlet[]>("/api/v1/buyer/outlets");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load outlets."));
  }
};

export const createOutlet = async (payload: OutletWrite): Promise<void> => {
  try {
    await axiosInstance.post("/api/v1/buyer/outlets", payload);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not create the outlet."));
  }
};

export const getWishlists = async (index = 0, limit = 20): Promise<WishlistListItem[]> => {
  try {
    const response = await axiosInstance.get<WishlistListItem[]>("/api/v1/buyer/wishlist", {
      params: { index, limit },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load wishlists."));
  }
};

export const getWishlist = async (wishlistId: string): Promise<WishlistDetail> => {
  try {
    const response = await axiosInstance.get<WishlistDetail>(`/api/v1/buyer/wishlist/${wishlistId}`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load this wishlist."));
  }
};

export const createWishlist = async (payload: WishlistWrite): Promise<void> => {
  try {
    await axiosInstance.post("/api/v1/buyer/wishlist", payload);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not create the wishlist."));
  }
};

export const updateWishlist = async (wishlistId: string, payload: WishlistWrite): Promise<void> => {
  try {
    await axiosInstance.put(`/api/v1/buyer/wishlist/${wishlistId}`, payload);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not update the wishlist."));
  }
};

export const decideWishlist = async (
  wishlistId: string,
  status: "APPROVE" | "REJECT",
  comment?: string,
): Promise<void> => {
  try {
    await axiosInstance.put(`/api/v1/buyer/wishlist/approval/${wishlistId}`, {
      status,
      comment: comment?.trim() ? comment.trim() : null,
    });
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not record the approval decision."));
  }
};
