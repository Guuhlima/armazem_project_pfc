'use client';
import Footer from "@/components/Footer";

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
