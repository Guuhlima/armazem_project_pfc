'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Props = {
    children: ReactNode;
    permOrRole?: string | string[];
};

export function RequireAuth({ children, permOrRole }: Props) {
    const { ready, isAuthenticated, hasPermission } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!ready) return;

        if (!isAuthenticated) {
            router.replace('/');
            return;
        }

        if (permOrRole && !hasPermission(permOrRole)) {
            router.replace('/home');
        }
    }, [ready, isAuthenticated, permOrRole, hasPermission, router]);

    if (!ready) {
        return <div>Carregando...</div>;
    }

    if (!isAuthenticated) return null;
    if (permOrRole && !hasPermission(permOrRole)) return null;

    return <>{children}</>;
}
