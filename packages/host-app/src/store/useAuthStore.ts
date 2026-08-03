import { create } from 'zustand';

export type UserRole = 'buyer' | 'supplier' |'supplier-admin'|'supplier-business-user'| 'platform-user'| 'buyer-admin' | 'buyer-business-user';
 
export const ROLE_MAPPING: Record<string, UserRole> = {
  '937aab61-b505-4e1c-a5a3-cd63e29c6db9': 'supplier',        // SUPPLIER_ADMINISTRATOR
  '5a72f81e-a2c5-4f4a-bd55-6376c3c9ed73': 'buyer',           // BUYER_ADMINISTRATOR
  '113d8ead-40c2-425a-bc60-5989e6cdabca': 'platform-user',   // PLATFORM_ADMINISTRATOR
  '61eb9b97-1fca-4beb-beb8-dc4b379cfa3a': 'platform-user',   // BUYER_NETWORK_ADMIN
  '22067509-af24-48f8-a7e9-416a0b6a439b': 'platform-user',   // SUPPLIER_NETWORK_ADMIN
  '735bb267-fec0-489f-8249-d3d65b3857ea': 'supplier-admin',         
  'c95f5a1b-4aec-4647-9328-895a58193ec4': 'buyer-admin',
};
export interface AuthState {
  isLoggedIn: boolean;
  userRole: UserRole | null;
  userId: string | null;
  personId: string | null;
  organizationId: string | null;
  roleId: string | null;
  login: (
    details?: {
      userId?: string;
      personId?: string;
      organizationId?: string;
      roleId?: string;
    }
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: sessionStorage.getItem('vosox_logged_in') === 'true',
  userRole: (sessionStorage.getItem('vosox_user_role') as UserRole | null) || null,
  userId: sessionStorage.getItem('vosox_user_id') || null,
  personId: sessionStorage.getItem('vosox_person_id') || null,
  organizationId: sessionStorage.getItem('vosox_organization_id') || null,
  roleId: sessionStorage.getItem('vosox_role_id') || null,
  login: (details) => {
    let resolvedRole: UserRole = 'supplier';
    if (details?.roleId && ROLE_MAPPING[details.roleId]) {
      resolvedRole = ROLE_MAPPING[details.roleId];
    }

    sessionStorage.setItem('vosox_logged_in', 'true');
    sessionStorage.setItem('vosox_user_role', resolvedRole);
    if (details?.userId) sessionStorage.setItem('vosox_user_id', details.userId);
    if (details?.personId) sessionStorage.setItem('vosox_person_id', details.personId);
    if (details?.organizationId) sessionStorage.setItem('vosox_organization_id', details.organizationId);
    if (details?.roleId) sessionStorage.setItem('vosox_role_id', details.roleId);

    set({
      isLoggedIn: true,
      userRole: resolvedRole,
      userId: details?.userId || null,
      personId: details?.personId || null,
      organizationId: details?.organizationId || null,
      roleId: details?.roleId || null,
    });
  },
  logout: () => {
    sessionStorage.clear();
    set({
      isLoggedIn: false,
      userRole: null,
      userId: null,
      personId: null,
      organizationId: null,
      roleId: null,
    });
  },
}));
