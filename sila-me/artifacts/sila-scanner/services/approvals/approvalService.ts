import type { UserRole } from '@/constants/config';

export type ApprovalType = 'INVENTORY_COUNT' | 'INVENTORY_ADJUSTMENT' | 'RECEIVING_EXCEPTION';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export type ApprovalRequest = {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  property: string;
  store: string;
  varianceItems?: number;
  totalItems?: number;
};

export const initialApprovalRequests: ApprovalRequest[] = [
  {
    id: 'approval-1',
    type: 'INVENTORY_COUNT',
    status: 'PENDING',
    title: 'Beverage Store inventory count',
    description: 'Review physical count variances before any adjustment is posted.',
    submittedBy: 'Omar Khalid',
    submittedAt: 'Today, 10:18 AM',
    property: 'FIVE Palm Jumeirah',
    store: 'Beverage Store',
    varianceItems: 2,
    totalItems: 18,
  },
  {
    id: 'approval-2',
    type: 'RECEIVING_EXCEPTION',
    status: 'PENDING',
    title: 'Fresh Foods delivery exception',
    description: 'Review damaged and rejected quantities before GRN completion.',
    submittedBy: 'Mariam Saeed',
    submittedAt: 'Today, 9:42 AM',
    property: 'FIVE Palm Jumeirah',
    store: 'Main Store',
  },
];

const approvalRoles: UserRole[] = ['Store Manager', 'Inventory Controller', 'Finance', 'Admin'];

export function canApprove(role: UserRole) {
  return approvalRoles.includes(role);
}

export function canApproveType(role: UserRole, type: ApprovalType) {
  if (!canApprove(role)) return false;
  if (type === 'INVENTORY_ADJUSTMENT') return ['Inventory Controller', 'Finance', 'Admin'].includes(role);
  return true;
}

export async function submitApprovalRequest(request: ApprovalRequest) {
  return { ...request, status: 'PENDING' as const };
}

export async function resolveApproval(id: string, status: Extract<ApprovalStatus, 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'>) {
  return { id, status };
}