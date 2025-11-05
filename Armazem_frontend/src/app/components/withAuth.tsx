'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const withAuth = (Wrapped: React.ComponentType) => {
  return function Protected(props: any) {
    const router = useRouter();
    const { ready, isAuthenticated } = useAuth();

    useEffect(() => {
      if (!ready) return;
      if (!isAuthenticated) router.replace('/');
    }, [ready, isAuthenticated, router]);

    if (!ready) return null;
    if (!isAuthenticated) return null;

    return <Wrapped {...props} />;
  };
};

export default withAuth;
