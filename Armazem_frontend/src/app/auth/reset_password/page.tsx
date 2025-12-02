import { Suspense } from 'react';
import Head from 'next/head';
import ResetPasswordClient
 from './reset-password-client';
function Loading() { return <div>Carregando…</div>; }

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordClient />
      <Head>
        <title>Armazem G3</title>
        <link rel="icon" href="pub" />
      </Head>
    </Suspense>
  );
}
