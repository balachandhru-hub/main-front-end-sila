import axios from "axios";
import axiosInstance from "./axiosInstance";
import { getMasterApprovalFlows, type MasterApprovalFlowDto } from "./Buyerapi";

export interface Outlet {
  id: string;
  outletName: string;
  outletCode?: string | null;
  description?: string | null;
  externalShipTo?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
  /** Approval flow (type WISHLIST) used by every wishlist of this outlet. */
  masterApprovalFlowId?: string | null;
  approvalName?: string | null;
}

export interface OutletWrite {
  outletName: string;
  outletCode?: string | null;
  description?: string | null;
  externalShipTo?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
  masterApprovalFlowId?: string | null;
}

/** The outlets assigned to one user. */
export interface OutletUserMapping {
  userId: string;
  outletIds: string[];
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
  /** true keeps the wishlist as an editable draft; false submits it, which freezes it and starts approval. */
  saveAsDraft: boolean;
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
  name?: string | null;
  email?: string | null;
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

export const updateOutlet = async (outletId: string, payload: OutletWrite): Promise<void> => {
  try {
    await axiosInstance.put(`/api/v1/buyer/outlets/${outletId}`, payload);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not update the outlet."));
  }
};

export const getOutletUsers = async (): Promise<OutletUserMapping[]> => {
  try {
    const response = await axiosInstance.get<OutletUserMapping[]>("/api/v1/buyer/outlets/users");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the outlets of each user."));
  }
};

/** Replaces the outlets assigned to a user. */
export const setUserOutlets = async (userId: string, outletIds: string[]): Promise<void> => {
  try {
    await axiosInstance.put(`/api/v1/buyer/outlets/users/${userId}`, { outletIds });
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not assign the outlets to the user."));
  }
};

/** Every approval flow of type WISHLIST of the buyer. */
export const getWishlistApprovalFlows = async (buyerId: string): Promise<MasterApprovalFlowDto[]> => {
  const collected: MasterApprovalFlowDto[] = [];
  const seen = new Set<string>();
  for (let page = 0; page < 10; page += 1) {
    const batch = await getMasterApprovalFlows(buyerId, page * 50, 50);
    const fresh = batch.filter((flow) => !seen.has(flow.id));
    fresh.forEach((flow) => seen.add(flow.id));
    collected.push(...fresh);
    if (batch.length < 50 || fresh.length === 0) break;
  }
  return collected.filter((flow) => (flow.type ?? "").toUpperCase() === "WISHLIST");
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
