import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { ROLE_ID_MAPPING } from '../constants/roleMapping';

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


const ROLE_ID_TO_USER_ROLE: Record<string, UserRole> = Object.fromEntries(
  Object.entries(ROLE_ID_MAPPING).map(([role, id]) => [id, role as UserRole])
);

function mapRoleIdToUserRole(roleId: string): UserRole | null {
  return ROLE_ID_TO_USER_ROLE[roleId] || null;
}