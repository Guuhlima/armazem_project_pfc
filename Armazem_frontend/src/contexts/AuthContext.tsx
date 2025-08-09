'use client';
import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: number;
  nome: string;
  email: string;
  permissoes: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  logout: () => void;
  hasPermission: (perm: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const userStorage = localStorage.getItem('user');
        if (userStorage) {
        setUser(JSON.parse(userStorage));
        }
    }, []);

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        window.location.href = '/';
    };

    const hasPermission = (perm: string | string[]) => {
        if (!user?.permissoes) return false;
        if (user.permissoes.includes('SUPER-ADMIN')) return true;
        
        if (Array.isArray(perm)) {
            return perm.some((p) => user.permissoes.includes(p));
        }

        return user.permissoes.includes(perm);
    };


    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, logout, hasPermission }}>
        {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
