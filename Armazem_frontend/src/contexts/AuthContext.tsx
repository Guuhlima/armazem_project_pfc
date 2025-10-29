'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { apiAuth } from '@/services/api';

type User = { id: number; nome: string | null; email: string };

interface AuthContextType {
  user: User | null;
  roles: string[];
  perms: string[];
  ready: boolean;
  isAuthenticated: boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permOrRole: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as any);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser]   = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [perms, setPerms] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  function setAxiosAuthHeader(token: string | null) {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      apiAuth.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
      delete apiAuth.defaults.headers.common.Authorization;
    }
  }

  async function fetchMe() {
    try {
      const { data } = await api.get('/user/me', { withCredentials: true });
      setUser(data.user ?? null);
      setRoles(data.roles ?? []);
      setPerms(data.perms ?? []);
    } catch {
      setUser(null);
      setRoles([]);
      setPerms([]);
    } finally {
      setReady(true);
    }
  }

  const reload = async () => {
    setReady(false);
    await fetchMe();
  };

  const logout = async () => {
    try {
      const rt = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (rt) {
        await apiAuth.post('/user/logout', { refreshToken: rt }, { withCredentials: true }).catch(() => {});
      }
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
      setAxiosAuthHeader(null);
      setUser(null);
      setRoles([]);
      setPerms([]);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:changed'));
      }

      router.replace('/home');
      router.refresh();
    }
  };

  const hasPermission = (permOrRole: string | string[]) => {
    if (!ready) return false;
    if (roles.includes('SUPER-ADMIN')) return true;

    const has = (s: string) =>
      roles.includes(s) || perms.includes(s); 

    if (Array.isArray(permOrRole)) return permOrRole.some(has);
    return has(permOrRole);
  };

  useEffect(() => {
    const at = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    setAxiosAuthHeader(at);
    if (at) fetchMe();
    else setReady(true);

    const onAuthChanged = () => reload();
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:changed', onAuthChanged);
      return () => window.removeEventListener('auth:changed', onAuthChanged);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      roles,
      perms,
      ready,
      isAuthenticated: !!user,
      reload,
      logout,
      hasPermission,
    }),
    [user, roles, perms, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
