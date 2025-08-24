// src/contexts/AuthContext.tsx
'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { apiAuth } from '@/services/api';

type User = { id: number; nome: string | null; email: string };

interface AuthContextType {
  user: User | null;
  roles: string[];
  perms: string[];
  ready: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  hasPermission: (perm: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as any);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [perms, setPerms] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  async function fetchMe() {
    try {
      const { data } = await api.get('/user/me'); // requer accessToken
      setUser(data.user ?? null);
      setRoles(data.roles ?? []);
      setPerms(data.perms ?? []);
    } catch {
      setUser(null); setRoles([]); setPerms([]);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    const at = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (at) fetchMe();
    else setReady(true); // não autenticado
  }, []);

  const logout = () => {
    try {
      const rt = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (rt) apiAuth.post('/user/logout', { refreshToken: rt }).catch(() => {});
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      setUser(null); setRoles([]); setPerms([]);
      window.location.href = '/';
    }
  };

  const hasPermission = (perm: string | string[]) => {
    if (!ready) return false;                 // 🔒 antes de carregar, nunca libera
    if (roles.includes('SUPER-ADMIN')) return true;
    if (Array.isArray(perm)) return perm.some((p) => perms.includes(p));
    return perms.includes(perm);
  };

  const value = useMemo(
    () => ({
      user, roles, perms, ready,
      isAuthenticated: !!user && !!(typeof window !== 'undefined' && localStorage.getItem('accessToken')),
      logout, hasPermission,
    }),
    [user, roles, perms, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
