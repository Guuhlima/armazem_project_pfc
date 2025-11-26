'use client';

import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function GestaoLayout({ children }: { children: ReactNode }) {
    return (
        <RequireAuth permOrRole={['GESTAO', 'ADMIN', 'SUPER-ADMIN']}>
            {children}
        </RequireAuth>
    );
}
