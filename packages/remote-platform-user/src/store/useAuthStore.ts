import { create } from 'zustand';
import type { User, UserRole } from '../types';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initializeFromSession: () => void;
  setCurrentUser: (user: User) => void;
  logout: () => void;
}

export const useNetworkAdminAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,

  initializeFromSession: () => {
    const userId = sessionStorage.getItem('vosox_user_id');
    const personId = sessionStorage.getItem('vosox_person_id');
    const organizationId = sessionStorage.getItem('vosox_organization_id');
    const roleId = sessionStorage.getItem('vosox_role_id');
    const userEmail = sessionStorage.getItem('vosox_user_email');
    const userName = sessionStorage.getItem('vosox_user_name');

    if (userId && roleId) {
      const mappedRole = mapRoleIdToUserRole(roleId);
      
      if (mappedRole) {
        const user: User = {
          id: userId,
          email: userEmail || `user-${userId}@company.com`,
          name: userName || 'User',
          userRole: mappedRole,
          createdAt: new Date().toISOString().split('T')[0],
          status: 'active',
          organizationId: organizationId || undefined,
          userId,
          personId: personId || undefined,
          roleId,
        };

        set({
          currentUser: user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, isAuthenticated: false });
      }
    } else {
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  setCurrentUser: (user: User) => {
    set({
      currentUser: user,
      isAuthenticated: true,
    });
    sessionStorage.setItem('vosox_user_email', user.email);
    sessionStorage.setItem('vosox_user_name', user.name);
  },

  logout: () => {
    set({
      currentUser: null,
      isAuthenticated: false,
    });
    sessionStorage.removeItem('vosox_user_email');
    sessionStorage.removeItem('vosox_user_name');
  },
}));


function mapRoleIdToUserRole(roleId: string): UserRole | null {
  const roleMap: Record<string, UserRole> = {
    '61eb9b97-1fca-4beb-beb8-dc4b379cfa3a': 'BUYER_NETWORK_ADMIN',
    '22067509-af24-48f8-a7e9-416a0b6a439b': 'SUPPLIER_NETWORK_ADMIN',
    'c95f5a1b-4aec-4647-9328-895a58193ec4': 'BUYER_ADMINISTRATOR',
    '735bb267-fec0-489f-8249-d3d65b3857ea': 'SUPPLIER_ADMINISTRATOR',
    '5a72f81e-a2c5-4f4a-bd55-6376c3c9ed73': 'BUYER_USER',
    '937aab61-b505-4e1c-a5a3-cd63e29c6db9': 'SUPPLIER_USER',
    '113d8ead-40c2-425a-bc60-5989e6cdabca': 'PLATFORM_ADMINISTRATOR',
  };

  return roleMap[roleId] || null;
}