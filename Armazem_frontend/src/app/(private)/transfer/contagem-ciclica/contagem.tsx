'use client';

import { Contagens } from "../../components/Contagem";
import { useAuth } from '@/contexts/AuthContext';

export default function ContagensPage() {
  const { user, hasPermission, ready } = useAuth();

  if (!ready) return null;

  const userId = user?.id ?? 0;

  const canGenerate = hasPermission('count:generate')

  return <Contagens userId={userId} canGenerate={canGenerate} />;
}
