import Head from 'next/head';
import UsuariosPage from './FormUsuarios';

export default function Page() {
  return (
    <main>
      <UsuariosPage />
      <Head>
        <title>Armazem G3</title>
        <link rel="icon" href="pub" />
      </Head>
    </main>
  );
}
