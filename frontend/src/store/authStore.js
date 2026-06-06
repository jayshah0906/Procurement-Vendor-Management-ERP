import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { id, name, email, role, vendor_id, organization_id }
      isAuthenticated: false,
      login: (userData, token) => {
        localStorage.setItem('accessToken', token);
        set({ user: userData, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage', // unique name for localStorage
    }
  )
);
