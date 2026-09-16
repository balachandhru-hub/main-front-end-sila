// Mock data — no Contract API yet.
export interface ContractRecord {
  id: string;
  referenceNumber: string;
  title: string;
  organizationName: string;
  requestedBy: string;
  raisedDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const contractsMock: ContractRecord[] = [
  {
    id: 'con-2001',
    referenceNumber: 'CON-2026-2001',
    title: 'Annual Facility Maintenance Contract',
    organizationName: 'Your Organization',
    requestedBy: 'Vikram Nair',
    raisedDate: '2026-08-05',
    status: 'PENDING',
  },
  {
    id: 'con-2002',
    referenceNumber: 'CON-2026-2002',
    title: 'Logistics & Freight Services Agreement',
    organizationName: 'Your Organization',
    requestedBy: 'Ishaan Kapoor',
    raisedDate: '2026-07-18',
    status: 'PENDING',
  },
  {
    id: 'con-2003',
    referenceNumber: 'CON-2026-2003',
    title: 'IT Managed Services Renewal',
    organizationName: 'Your Organization',
    requestedBy: 'Divya Iyer',
    raisedDate: '2026-06-30',
    status: 'REJECTED',
  },
  {
    id: 'con-2004',
    referenceNumber: 'CON-2026-2004',
    title: 'Office Lease Renewal - East Wing',
    organizationName: 'Your Organization',
    requestedBy: 'Aditya Rao',
    raisedDate: '2026-06-15',
    status: 'APPROVED',
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const fetchContracts = async (): Promise<ContractRecord[]> => {
  await delay(300);
  return JSON.parse(JSON.stringify(contractsMock));
};
