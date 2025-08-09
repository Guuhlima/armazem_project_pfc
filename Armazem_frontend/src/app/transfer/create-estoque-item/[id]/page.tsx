'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CreateEstoqueItemForm from './CreateEstoqueItemForm';

export default function EstoqueItemPage() {
  const params = useParams();
  const router = useRouter();
  const [estoqueId, setEstoqueId] = useState<number | null>(null);

  useEffect(() => {
    const id = params?.id;
    const parsedId = Number(id);
    if (isNaN(parsedId)) {
      router.replace('/404');
    } else {
      setEstoqueId(parsedId);
    }
  }, [params, router]);

  if (estoqueId === null) return null;

  return (
    <div>
      <CreateEstoqueItemForm estoqueId={estoqueId} />
    </div>
  );
}
