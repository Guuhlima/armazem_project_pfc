// CreateItemPage.tsx
import Head from 'next/head';
import FormCreateItem from "./FormCreateItem";
import Footer from "@/components/Footer";

export default function CreateItemPage() {
  return (
    <>
      <main>
        <FormCreateItem />
        <Head>
          <title>Armazem G3</title>
          <link rel="icon" href="pub" />
        </Head>
      </main>

      <Footer />
    </>
  );
}
