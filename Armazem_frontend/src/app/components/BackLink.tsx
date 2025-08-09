'use client';

import Link from 'next/link';

interface BackLinkProps {
  href: string;
}

const BackLink = ({ href }: BackLinkProps) => (
  <Link
    href={href}
    className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded shadow transition"
  >
    Voltar
  </Link>
);

export default BackLink;
