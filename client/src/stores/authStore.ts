import { create } from 'zustand';
import api from '@/lib/api';

interface AuthState {
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, clientUrl?: string, inviteCode?: string) => Promise<any>;
  verify: (token: string) => Promise<void>;
  setTokensAndLoad: (accessToken: string, refreshToken: string) => Promise<void>;
  checkSession: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
}

// ── Refresh mutex ──
// At 200+ participants, many concurrent requests can hit 401 simultaneously.
// Without a mutex, each one triggers a separate refresh call, causing token
// rotation races (server revokes token A while client B is still using it).
// The mutex ensures only ONE refresh runs; all others piggyback on its result.
let refreshPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('rsn_access') || null,
  refreshToken: localStorage.getItem('rsn_refresh') || null,
  isAuthenticated: !!localStorage.getItem('rsn_access'),
  isLoading: true,

  login: async (email: string, clientUrl?: string, inviteCode?: string) => {
    const { data } = await api.post('/auth/magic-link', { email, clientUrl, inviteCode });
    return data;
  },

  verify: async (token: string) => {
    const { data } = await api.post('/auth/verify', { token });
    const { accessToken, refreshToken } = data.data;
    localStorage.setItem('rsn_access', accessToken);
    localStorage.setItem('rsn_refresh', refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
    await get().checkSession();
  },

  setTokensAndLoad: async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('rsn_access', accessToken);
    localStorage.setItem('rsn_refresh', refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
    await get().checkSession();
  },

  checkSession: async () => {
    const token = get().accessToken;
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }
    try {
      const { data } = await api.get('/auth/session', { timeout: 15000 });
      set({ user: data.data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      // Only log out on 401 (token genuinely invalid/expired).
      // Network errors, timeouts, 5xx — keep the user logged in so a
      // server hiccup or Render cold-start doesn't nuke the session.
      if (err?.response?.status === 401) {
        set({ isLoading: false, isAuthenticated: false, user: null });
      } else {
        set({ isLoading: false });
      }
    }
  },

  refreshAccessToken: async () => {
    // Mutex: if a refresh is already in-flight, piggyback on it
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const refresh = get().refreshToken;
        if (!refresh) throw new Error('No refresh token');
        const { data } = await api.post('/auth/refresh', { refreshToken: refresh });
        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem('rsn_access', accessToken);
        localStorage.setItem('rsn_refresh', newRefresh);
        set({ accessToken, refreshToken: newRefresh });
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  logout: async () => {
    // Prevent multiple simultaneous logout calls
    const current = get();
    if (!current.accessToken && !current.refreshToken) return;

    // Call logout endpoint before clearing tokens so the auth header is still present
    // Use catch to silently ignore errors (e.g., if token is already invalid)
    await api.post('/auth/logout').catch(() => {});

    localStorage.removeItem('rsn_access');
    localStorage.removeItem('rsn_refresh');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
  },

  setTokens: (access: string, refresh: string) => {
    localStorage.setItem('rsn_access', access);
    localStorage.setItem('rsn_refresh', refresh);
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
  },
}));
