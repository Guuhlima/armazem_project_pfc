'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const withAuth = (WrappedComponent: React.ComponentType) => {
  return function ProtectedRoute(props: any) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
      if (!isAuthenticated) {
        router.push('/');
      }
    }, [isAuthenticated]);

    if (!isAuthenticated) return null;

    return <WrappedComponent {...props} />;
  };
};

export default withAuth;
