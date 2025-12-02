'use client';
import Footer from "@/components/Footer";
import Head from 'next/head';

import dynamic from 'next/dynamic';

const Home = dynamic(() => import('./Home'), { ssr: false });

export default function HomePage() {
  return (
    <>
      <Home />
      <Head>
        <title>Armazem G3</title>
        <link rel="icon" href="pub" />
      </Head>
    </>
  );

}
