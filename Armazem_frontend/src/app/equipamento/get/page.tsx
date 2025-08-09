import Link from 'next/link';
import GetItemById from './GetItemById';
import BackLink from "@/app/components/BackLink"

export default function GetPage() {
  return (
    <main className="p-8">
      <div className="mb-4">
        <BackLink href="/home" />
      </div>
      <h1 className="text-3xl font-bold text-center mb-6">Consultar Equipamento</h1>
      <GetItemById />
    </main>
  );
}
