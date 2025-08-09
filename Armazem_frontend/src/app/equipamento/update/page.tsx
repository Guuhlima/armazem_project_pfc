'use client';

import FormEditItem from './FormEditItem';
import BackLink from '@/app/components/BackLink';

export default function EditItemPage() {
  return (
    <main className="p-8">
      <BackLink href="/home" />
      <h1 className="text-3xl font-bold text-center mb-6">Editar Equipamento</h1>
      <FormEditItem />
    </main>
  );
}
