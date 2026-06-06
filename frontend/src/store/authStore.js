import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // Backend user shape: { id, first_name, last_name, email, role, organization_id, vendor_id, is_vendor, permissions }
      user: null,
      isAuthenticated: false,

      login: (userData, token, refreshToken) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user: userData, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false });
      },

      // Used by client.js interceptor after a successful token refresh
      setToken: (token) => {
        localStorage.setItem('accessToken', token);
      },

      // Computed display name helper
      getDisplayName: () => {
        const user = get().user;
        if (!user) return '';
        return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
      },
    }),
    {
      name: 'auth-storage',
      // Don't persist tokens in zustand state — they live in localStorage directly
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
