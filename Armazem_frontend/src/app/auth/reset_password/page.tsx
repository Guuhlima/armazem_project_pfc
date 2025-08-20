import { Suspense } from 'react';
import ResetPasswordClient
 from './reset-password-client';
function Loading() { return <div>Carregando…</div>; }

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
