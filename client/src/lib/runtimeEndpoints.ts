const ACTIVE_TUNNEL_ORIGIN = 'https://wan-combined-unless-fee.trycloudflare.com';

function isVercelHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('vercel.app');
}

export const API_BASE_URL = isVercelHost()
  ? `${ACTIVE_TUNNEL_ORIGIN}/api`
  : (import.meta.env.VITE_API_URL || '/api');

export const SOCKET_BASE_URL = isVercelHost()
  ? ACTIVE_TUNNEL_ORIGIN
  : (import.meta.env.VITE_SERVER_URL || '/');
