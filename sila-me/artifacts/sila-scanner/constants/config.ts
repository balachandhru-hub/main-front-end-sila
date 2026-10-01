export const customerConfig = {
  customer: 'FIVE Hotels & Resorts',
  properties: ['FIVE Palm Jumeirah', 'FIVE Jumeirah Village', 'FIVE LUXE'],
  departments: [
    'Main Store',
    'F&B Store',
    'Engineering Store',
    'Housekeeping Store',
    'Finance',
    'Receiving',
  ],
};

export type UserRole =
  | 'Receiver'
  | 'Store Staff'
  | 'Store Manager'
  | 'Inventory Controller'
  | 'Finance'
  | 'Admin';

export const demoUser = {
  name: 'Aisha Rahman',
  email: 'aisha.rahman@fivehotels.com',
  role: 'Store Manager' as UserRole,
};

export const demoInvoice = {
  supplierName: 'Fresh Foods Trading LLC',
  invoiceNumber: 'INV45821',
  invoiceDate: '2026-09-10',
  poNumber: '4500123456',
};