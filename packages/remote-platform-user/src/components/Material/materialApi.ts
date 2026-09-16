import platformInstance from '../../api/platformInstance';

// approvalId maps to GET /master-approval-flow/{approvalId} — not
// approvalFlowPredefinedMaterialId or approvalMappingId.
export interface PendingMaterialApproval {
  predefinedMaterialId: string;
  approvalId: string;
  approvalFlowPredefinedMaterialId: string;
  approvalMappingId: string;
  order: number;
  approvalStatus: string;
  materialCode: string;
  productType: string;
  description: string;
  materialGroup: string;
  status: string;
}

export interface MaterialApprovalDetail {
  id: string;
  buyerId: string;
  baseUnitOfMeasure: string;
  orderUnitOfMeasure: string;
  alternateUnitOfMeasure: string;
  valuationClass: string;
  unitOfMeasureMapping: string;
  subUnit: string;
  microUnit: string;
  status: string;
  approvalUserIds: string[];
}

export interface MaterialApprovalKpi {
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

// No per-approver status in this response — only id/userId/order/name/email.
export interface MaterialApprovalFlowUser {
  id: string;
  userId: string;
  order: number;
  name: string;
  email: string;
}

export const MATERIAL_APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const;

export const MATERIAL_STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Status', value: '' },
  { label: 'Pending', value: MATERIAL_APPROVAL_STATUS.PENDING },
  { label: 'Approved', value: MATERIAL_APPROVAL_STATUS.APPROVE },
  { label: 'Rejected', value: MATERIAL_APPROVAL_STATUS.REJECT },
];

export interface MaterialApprovalActionPayload {
  status: string;
  comment: string;
}

export interface MaterialApprovalActionResponse {
  statusCode: number;
  message: string;
  description: string;
  id: string;
}

const toError = (error: any, fallback: string): Error => {
  const data = error?.response?.data;
  if (data) {
    return new Error(data.message || data.description || `${fallback} (${error.response.status}).`);
  }
  return new Error('Could not reach the server. Please check your connection and try again.');
};

export type StatusTone = 'approved' | 'rejected' | 'pending' | 'neutral';

export const classifyStatusText = (status: string | null | undefined): StatusTone => {
  const s = (status || '').toLowerCase();
  if (s.includes('reject')) return 'rejected';
  if (s.includes('approv') || s.includes('complete')) return 'approved';
  if (s.includes('pend') || s.includes('open')) return 'pending';
  return 'neutral';
};

export const fetchPendingMaterialApprovals = async (
  params: { status?: string; searchTerm?: string } = {}
): Promise<PendingMaterialApproval[]> => {
  try {
    const response = await platformInstance.get<PendingMaterialApproval[]>('/api/v1/buyer/item-master/pending-approvals', {
      params: {
        status: params.status || undefined,
        searchTerm: params.searchTerm?.trim() || undefined,
      },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    throw toError(error, 'Failed to load material approvals');
  }
};

export const fetchMaterialApprovalKpi = async (): Promise<MaterialApprovalKpi> => {
  try {
    const response = await platformInstance.get<MaterialApprovalKpi>('/api/v1/buyer/item-master/approval-kpi');
    return response.data;
  } catch (error: any) {
    throw toError(error, 'Failed to load approval summary counts');
  }
};

export const fetchMaterialApprovalFlowUsers = async (approvalId: string): Promise<MaterialApprovalFlowUser[]> => {
  try {
    const response = await platformInstance.get<MaterialApprovalFlowUser[]>(
      `/api/v1/buyer/master-approval-flow/${approvalId}`
    );
    const data = Array.isArray(response.data) ? response.data : [];
    return [...data].sort((a, b) => a.order - b.order);
  } catch (error: any) {
    throw toError(error, 'Failed to load the approval flow');
  }
};

export const fetchMaterialApprovalDetail = async (predefinedMaterialId: string): Promise<MaterialApprovalDetail> => {
  try {
    const response = await platformInstance.get<MaterialApprovalDetail>(
      `/api/v1/buyer/item-master/approval/${predefinedMaterialId}`
    );
    return response.data;
  } catch (error: any) {
    throw toError(error, 'Failed to load material approval details');
  }
};

export const submitMaterialApprovalAction = async (
  predefinedMaterialId: string,
  payload: MaterialApprovalActionPayload
): Promise<MaterialApprovalActionResponse> => {
  try {
    const response = await platformInstance.put<MaterialApprovalActionResponse>(
      `/api/v1/buyer/item-master/approval/${predefinedMaterialId}`,
      payload
    );
    return response.data;
  } catch (error: any) {
    throw toError(error, 'Failed to submit your decision');
  }
};
