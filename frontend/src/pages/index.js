import Head from 'next/head';
import JewelleryStudio from '../components/JewelleryStudio';
import PromptStudio from '../components/PromptStudio';

export default function Home() {
  return (
    <div className="app-container">
      <Head>
        <title>Jewellery studio</title>
        <meta name="description" content="AI Powered Jewellery Photoshoot Studio" />
      </Head>

      <header className="main-header">
        <h1 className="brand-logo">Jewellery studio</h1>
        <p className="brand-tagline">Upload reference photos, pick a jewellery type, then generate an AI photoshoot in parallel. Your Gemini API key stays on the server.</p>
      </header>

      <main className="main-layout">
        <div className="column left-column">
          <JewelleryStudio />
        </div>
        <div className="column right-column">
          <PromptStudio />
        </div>
      </main>
    </div>
  );
}
