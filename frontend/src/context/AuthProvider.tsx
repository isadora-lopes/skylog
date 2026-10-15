import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PublicUser } from '../types/api';
import * as authService from '../services/authService';
import { AuthContext } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(() => {
    const saved = localStorage.getItem('skylog_user');
    return saved ? (JSON.parse(saved) as PublicUser) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem('skylog_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .getMe()
      .then((fresh) => {
        setUser(fresh);
        localStorage.setItem('skylog_user', JSON.stringify(fresh));
      })
      .catch(() => {
        localStorage.removeItem('skylog_token');
        localStorage.removeItem('skylog_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(email: string, password: string) {
        const data = await authService.login(email, password);
        if (!data.token || !data.user) throw new Error(data.message || 'Falha no login');
        localStorage.setItem('skylog_token', data.token);
        localStorage.setItem('skylog_user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
      },
      async register(name: string, email: string, password: string) {
        const data = await authService.register(name, email, password);
        if (!data.token || !data.user) throw new Error(data.message || 'Falha no registro');
        localStorage.setItem('skylog_token', data.token);
        localStorage.setItem('skylog_user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
      },
      logout() {
        localStorage.removeItem('skylog_token');
        localStorage.removeItem('skylog_user');
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
