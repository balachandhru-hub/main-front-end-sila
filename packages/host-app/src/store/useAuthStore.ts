import { create } from 'zustand';

export type UserRole = 'buyer' | 'supplier';

export interface AuthState {
  isLoggedIn: boolean;
  userRole: UserRole | null;
  login: (role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: localStorage.getItem('vosox_logged_in') === 'true',
  userRole: (localStorage.getItem('vosox_user_role') as UserRole | null) || null,
  login: (role: UserRole) => {
    localStorage.setItem('vosox_logged_in', 'true');
    localStorage.setItem('vosox_user_role', role);
    set({ isLoggedIn: true, userRole: role });
  },
  logout: () => {
    localStorage.removeItem('vosox_logged_in');
    localStorage.removeItem('vosox_user_role');
    set({ isLoggedIn: false, userRole: null });
  },
}));
