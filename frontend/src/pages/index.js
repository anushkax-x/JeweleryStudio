import Head from 'next/head';
import JewelleryStudio from '../components/JewelleryStudio';
import { useState } from 'react';
import { DEFAULT_MODEL_PROMPT, DEFAULT_PRODUCT_PROMPT } from '../lib/promptDefaults';

export default function Home() {
  const [masterPrompt, setMasterPrompt] = useState('');
  const [modelPrompt, setModelPrompt] = useState(DEFAULT_MODEL_PROMPT);
  const [productPrompt, setProductPrompt] = useState(DEFAULT_PRODUCT_PROMPT);
  const [modelCentric, setModelCentric] = useState(2);
  const [enhancedProduct, setEnhancedProduct] = useState(1);

  return (
    <>
      <Head>
        <title>Anoree — AI Jewellery Studio</title>
        <meta name="description" content="Premium AI photoshoot studio for jewellery brands" />
      </Head>

      <div className="relative min-h-screen">
        <div
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(143,115,72,0.08),transparent)]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-2xl px-5 pb-12 pt-6 sm:px-6 sm:pt-8">
          <header className="mb-6 grid grid-cols-1 items-end gap-4 sm:grid-cols-2 sm:gap-8">
            <div>
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.28em] text-accent">
                Jewellery studio
              </p>
              <h1 className="font-display mt-1 text-[2.25rem] font-medium leading-none tracking-tight text-ink sm:text-[2.75rem]">
                Anoree
              </h1>
            </div>
            <p className="text-[0.88rem] leading-relaxed text-muted sm:text-right sm:max-w-[16rem] sm:justify-self-end">
              Upload your piece, set creative direction, and receive editorial &amp; product imagery.
            </p>
          </header>

          <JewelleryStudio
            masterPrompt={masterPrompt}
            setMasterPrompt={setMasterPrompt}
            modelPrompt={modelPrompt}
            setModelPrompt={setModelPrompt}
            productPrompt={productPrompt}
            setProductPrompt={setProductPrompt}
            modelCount={modelCentric}
            setModelCount={setModelCentric}
            productCount={enhancedProduct}
            setProductCount={setEnhancedProduct}
          />

          <footer className="mt-12 text-center text-[0.7rem] tracking-wide text-subtle">
            Anoree
          </footer>
        </div>
      </div>
    </>
  );
}
