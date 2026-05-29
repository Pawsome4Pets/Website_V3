import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from token on first mount.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!getToken()) { setLoading(false); return; }
      try {
        const { user } = await apiFetch('/auth/me');
        if (!cancelled) setUser(user);
      } catch {
        if (!cancelled) { setToken(null); setUser(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { token, user } = await apiFetch('/auth/login', {
      method: 'POST', body: { email, password }, auth: false,
    });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user } = await apiFetch('/auth/register', {
      method: 'POST', body: payload, auth: false,
    });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
