import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  company: string | null;
  jobTitle: string | null;
  industry: string | null;
  interests: string[];
  reasonsToConnect: string[];
  languages: string[];
  role: string;
  profileComplete: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('rsn_access_token'),
  refreshToken: localStorage.getItem('rsn_refresh_token'),
  isAuthenticated: !!localStorage.getItem('rsn_access_token'),
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('rsn_access_token', accessToken);
    localStorage.setItem('rsn_refresh_token', refreshToken);
    set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('rsn_access_token');
    localStorage.removeItem('rsn_refresh_token');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
  },

  refreshAccessToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return false;
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken });
      const { accessToken: newAccess, refreshToken: newRefresh } = data.data;
      localStorage.setItem('rsn_access_token', newAccess);
      localStorage.setItem('rsn_refresh_token', newRefresh);
      set({ accessToken: newAccess, refreshToken: newRefresh });
      return true;
    } catch {
      get().logout();
      return false;
    }
  },

  checkSession: async () => {
    const { accessToken } = get();
    if (!accessToken) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await api.get('/auth/session');
      if (data.data?.userId) {
        const { data: profileData } = await api.get('/users/me');
        set({ user: profileData.data, isAuthenticated: true, isLoading: false });
      } else {
        get().logout();
      }
    } catch {
      // Try refresh
      const ok = await get().refreshAccessToken();
      if (ok) {
        try {
          const { data: profileData } = await api.get('/users/me');
          set({ user: profileData.data, isAuthenticated: true, isLoading: false });
        } catch {
          get().logout();
        }
      } else {
        get().logout();
      }
    }
  },
}));
