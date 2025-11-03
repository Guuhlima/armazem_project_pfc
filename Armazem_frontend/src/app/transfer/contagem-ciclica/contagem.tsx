'use client';

import { Contagens } from "../../components/Contagem";
import { useAuth } from '@/contexts/AuthContext';

export default function ContagensPage() {
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  return <Contagens userId={userId} />;
}
