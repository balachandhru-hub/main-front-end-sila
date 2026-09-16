import platformInstance from '../../api/platformInstance';
import type { OrganizationUserDto } from '../../dto/networkAdminDto';

export interface MasterApprovalFlow {
  id: string;
  approvalCode: string;
  approvalName: string;
  buyerId: string;
  type?: string;
  totalAmount?: number;
  currency?: string;
  order?: number;
  orderNumber?: number;
}

export interface CreateMasterApprovalFlowPayload {
  approvalCode: string;
  approvalName: string;
  type: string;
  totalAmount: number;
  currency: string;
  users: { userId: string; order: number }[];
}

export interface ApprovalTypeOption {
  id: string;
  key: string;
  type: string;
  description: string;
}

export interface CurrencyOption {
  id: string;
  currencyName: string;
  sortNumber: number;
}

const toError = (error: any, fallback: string): Error => {
  const data = error?.response?.data;
  if (data) {
    return new Error(data.message || data.description || `${fallback} (${error.response.status}).`);
  }
  return new Error('Could not reach the server. Please check your connection and try again.');
};

export const fetchMasterApprovalFlows = async (params: {
  buyerId: string;
  index: number;
  limit: number;
}): Promise<MasterApprovalFlow[]> => {
  try {
    const response = await platformInstance.get('/api/v1/buyer/master-approval-flow', { params });
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return data && typeof data === 'object' && data.id ? [data] : [];
  } catch (error: any) {
    throw toError(error, 'Failed to fetch approval flows');
  }
};

export interface ApprovalFlowUser {
  id?: string;
  userId: string;
  order: number;
}

// Returns the approvers of an approval flow, sorted by approval order.
// The API may return plain IDs or { userId, order } objects.
export const fetchApprovalFlowUsers = async (approvalId: string): Promise<ApprovalFlowUser[]> => {
  try {
    const response = await platformInstance.get(`/api/v1/buyer/master-approval-flow/${approvalId}`);
    const data: unknown[] = Array.isArray(response.data) ? response.data : [];
    return data
      .map((item: any, index): ApprovalFlowUser =>
        typeof item === 'string'
          ? { userId: item, order: index + 1 }
          : {
              id: typeof item?.id === 'string' ? item.id : undefined,
              userId: item?.userId,
              order: typeof item?.order === 'number' ? item.order : index + 1,
            }
      )
      .filter((item) => typeof item.userId === 'string' && !!item.userId)
      .sort((a, b) => a.order - b.order);
  } catch (error: any) {
    throw toError(error, 'Failed to fetch approval flow users');
  }
};

export interface UpdateApprovalFlowPayload {
  approvalCode: string;
  approvalName: string;
  order: number;
}

export const updateApprovalFlow = async (
  approvalFlowUserMappingId: string,
  payload: UpdateApprovalFlowPayload
): Promise<void> => {
  try {
    await platformInstance.put(`/api/v1/buyer/approval-flow-user-mapping/${approvalFlowUserMappingId}`, payload);
  } catch (error: any) {
    throw toError(error, 'Failed to update approval flow');
  }
};

export const createMasterApprovalFlow =async (payload: CreateMasterApprovalFlowPayload): Promise<void> => {
  try {
    await platformInstance.post('/api/v1/buyer/master-approval-flow', payload);
  } catch (error: any) {
    throw toError(error, 'Failed to create approval flow');
  }
};

export const fetchApprovalTypes = async (): Promise<ApprovalTypeOption[]> => {
  try {
    const response = await platformInstance.post('/api/v1/masterdata/metadata/reference-list', ['APPROVAL_TYPE']);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    throw toError(error, 'Failed to fetch approval types');
  }
};

export const fetchCurrencies = async (): Promise<CurrencyOption[]> => {
  try {
    const response = await platformInstance.get('/api/v1/masterdata/currencies', {
      params: { index: 0, limit: 100 },
    });
    const items: CurrencyOption[] = Array.isArray(response.data?.items) ? response.data.items : [];
    return [...items].sort((a, b) => a.sortNumber - b.sortNumber);
  } catch (error: any) {
    throw toError(error, 'Failed to fetch currencies');
  }
};

export const fetchApprovalUsers = async (organizationId: string): Promise<OrganizationUserDto[]> => {
  try {
    const response = await platformInstance.get<OrganizationUserDto[]>('/api/v1/identity/organization-user-rfq', {
      params: { organizationId },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    throw toError(error, 'Failed to fetch users');
  }
};
