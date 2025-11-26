'use client';
import Footer from "@/app/(private)/components/Footer";

import dynamic from 'next/dynamic';

const Home = dynamic(() => import('./Home'), { ssr: false });

export default function HomePage() {
  return (
    <>
      <Home />
      {/* <Footer /> */}
    </>
  );

}
