const TOKEN_KEY = 'fitai_token'

// In production (Vercel), set VITE_API_URL to the Railway backend URL.
// In development, leave it unset — Vite's proxy handles /api → localhost:3001.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = tokenStore.get()
  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  })
}
