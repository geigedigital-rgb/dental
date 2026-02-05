import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = { id: string; email: string; fullName: string; role: { name: string } };

type AuthState = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('auth_token', token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ token: null, user: null });
      },
      hydrate: () => {
        const token = localStorage.getItem('auth_token');
        if (token) set((s) => ({ ...s, token }));
      },
    }),
    { name: 'auth', partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
);
