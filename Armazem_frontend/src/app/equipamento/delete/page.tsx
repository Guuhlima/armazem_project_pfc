import Link from 'next/link';
import DeleteItem from './DeleteItem';
import BackLink from "@/app/components/BackLink"

export default function DeletePage() {
  return (
    <main className="p-8">
      <div className="mb-4">
        <BackLink href="/home" />
      </div>
      <h1 className="text-3xl font-bold text-center mb-6">Deletar Equipamento</h1>
      <DeleteItem />
    </main>
  );
}
