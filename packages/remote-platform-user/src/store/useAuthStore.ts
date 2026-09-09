import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { ROLE_ID_MAPPING } from '../constants/roleMapping';
import { getTokenClaims } from '../api/platformApi'

export interface TokenClaims {
  userId: string;
  personId?: string;
  organizationId?: string;
  roleId: string;
  permissions?: string[];
  buyerId?: string;
  supplierId?: string | null;
  organizationType?: number;
}

export interface AuthState {
  currentUser: User | null;
  claims: TokenClaims | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initializeFromSession: () => Promise<void>;
  setCurrentUser: (user: User) => void;
  setClaims: (claims: TokenClaims) => void;
  logout: () => void;
}

export const useNetworkAdminAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  claims: null,
  isAuthenticated: false,
  isLoading: true,
  initializeFromSession: async () => {
    
    let claims;

    try {
      claims = await getTokenClaims(true);
      set({ claims });
    } catch {
      set({
        claims: null,
        currentUser: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return;
    }
    if (claims && claims.userId && claims.roleId) {
      const mappedRole = mapRoleIdToUserRole(claims.roleId);
      
      if (mappedRole) {
        const user: User = {
          id: claims.userId,
          email: `user-${claims.userId}@company.com`,
          name: 'User',
          userRole: mappedRole,
          createdAt: new Date().toISOString().split('T')[0],
          status: 'active',
          organizationId: claims.organizationId || undefined,
          userId: claims.userId,
          personId: claims.personId || undefined,
          roleId: claims.roleId,
          buyerId: claims.buyerId || undefined,
          supplierId: claims.supplierId || undefined,
        };

        set({
          currentUser: user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ 
          claims: null,
          currentUser: null,
          isLoading: false, 
          isAuthenticated: false });
      }
    } else {
      set({ isLoading: false, isAuthenticated: false,claims: null, currentUser: null, });
    }
  },


  setCurrentUser: (user: User) => {
    set({
      currentUser: user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setClaims: (claims: TokenClaims) => {
  set({ claims });
  },

  logout: () => {
    set({
      currentUser: null,
      claims: null,
      isAuthenticated: false,
    });
  },
}));


const ROLE_ID_TO_USER_ROLE: Record<string, UserRole> = Object.fromEntries(
  Object.entries(ROLE_ID_MAPPING).map(([role, id]) => [id, role as UserRole])
);

function mapRoleIdToUserRole(roleId: string): UserRole | null {
  return ROLE_ID_TO_USER_ROLE[roleId] || null;
}