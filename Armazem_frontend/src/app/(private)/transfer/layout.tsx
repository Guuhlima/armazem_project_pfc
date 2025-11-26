'use client';

import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function TransferLayout({ children }: { children: ReactNode }) {
    return (
        <RequireAuth permOrRole={['TRANSFER', 'ADMIN', 'SUPER-ADMIN']}>
            {children}
        </RequireAuth>
    );
}
