import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  full_name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      login: (token: string, user: User) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
      updateUser: (user: User) =>
        set((state) => ({
          ...state,
          user,
        })),
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'nop-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);