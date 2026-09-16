import platformInstance from '../../api/platformInstance';

// Matches the shape returned by GET /api/v1/buyer/item-master/pending-approvals.
// approvalId is the id to pass to GET /api/v1/buyer/master-approval-flow/{approvalId}
// (confirmed against a real API response — it's a dedicated field, not one of
// the other three IDs on this row).
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

// Matches GET /api/v1/buyer/item-master/approval/{predefinedMaterialId}.
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

// Matches GET /api/v1/buyer/item-master/approval-kpi.
export interface MaterialApprovalKpi {
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

// Matches GET /api/v1/buyer/master-approval-flow/{approvalId} — the
// approvers of the flow assigned to a material, in order, with resolved
// name/email (no separate user-lookup call needed for this feature anymore).
export interface MaterialApprovalFlowUser {
  id: string;
  userId: string;
  order: number;
  name: string;
  email: string;
}

// Confirmed against a real /pending-approvals response (approvalStatus came
// back as "PENDING" / "APPROVE") and the explicit backend convention given
// separately: PENDING / APPROVE / REJECT (verb form, not APPROVED/REJECTED)
// is the one status vocabulary used across approvalStatus, the status
// filter query param, and the PUT action body.
export const MATERIAL_APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const;

// Dropdown labels stay human-readable; the values sent to the API are the
// backend's own PENDING/APPROVE/REJECT tokens.
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

// Matches the PUT .../approval/{predefinedMaterialId} success response.
export interface MaterialApprovalActionResponse {
  statusCode: number;
  message: string;
  description: string;
  id: string;
}

// Same error-handling shape used throughout the project's api/*.ts files
// (see ../../api/platformApi.ts, ../ApprovalManagement/approvalManagementApi.ts):
// prefer the backend's own message/description, fall back to a generic one.
// 401s are already handled centrally by platformInstance's response
// interceptor (silent refresh-token retry), so no special-casing is needed
// here — only the final failure (if refresh also fails) reaches this catch.
const toError = (error: any, fallback: string): Error => {
  const data = error?.response?.data;
  if (data) {
    return new Error(data.message || data.description || `${fallback} (${error.response.status}).`);
  }
  return new Error('Could not reach the server. Please check your connection and try again.');
};

// approvalStatus/status come back as free-form strings (the material's own
// `status` field has been seen as "OPEN" for an undecided item, distinct
// from approvalStatus's "PENDING") so this is a best-effort visual
// classification for the light status badge — it degrades to a neutral
// grey badge for any value it doesn't recognize rather than assuming a
// fixed set of values.
export type StatusTone = 'approved' | 'rejected' | 'pending' | 'neutral';

export const classifyStatusText = (status: string | null | undefined): StatusTone => {
  const s = (status || '').toLowerCase();
  if (s.includes('reject')) return 'rejected';
  if (s.includes('approv')) return 'approved';
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
