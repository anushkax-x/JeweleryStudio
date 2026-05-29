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

      <div className="min-h-screen bg-canvas">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-accent-muted blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#e8e4de]/60 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-accent">Studio</p>
              <h1 className="font-display mt-2 text-4xl font-medium tracking-tight text-ink sm:text-5xl">
                Anoree
              </h1>
              <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">
                Editorial model shots and product packshots — crafted from your pieces and creative direction.
              </p>
            </div>
            <div className="flex gap-6 text-[0.8rem] text-muted">
              <div>
                <span className="block text-2xl font-display text-ink">{modelCentric + enhancedProduct}</span>
                shots per run
              </div>
              <div className="w-px bg-line" />
              <div>
                <span className="block text-2xl font-display text-ink">AI</span>
                powered
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-3xl">
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
          </div>

          <footer className="mt-16 border-t border-line pt-8 text-center text-[0.75rem] text-subtle">
            Anoree · Jewellery imagery for modern brands
          </footer>
        </div>
      </div>
    </>
  );
}
