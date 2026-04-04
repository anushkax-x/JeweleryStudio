import Head from "next/head";
import JewelleryStudio from "../components/JewelleryStudio";
import PromptStudio from "../components/PromptStudio";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";

export default function Home() {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [modelCentric, setModelCentric] = useState(2);
  const [enhancedProduct, setEnhancedProduct] = useState(1);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <>
      <Head>
        <title>Anoree | Jewellery Photoshoot Studio</title>
      </Head>
      <div className="max-w-[1100px] mx-auto py-8 px-[3%]">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-[1.8rem] font-semibold text-text-primary tracking-tight mb-2">Anoree</h1>
            <p className="text-[0.95rem] text-text-secondary">AI Jewellery Photoshoot Studio</p>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-[#2a2e38] text-gray-300 border border-[#3b404d] px-4 py-1.5 rounded-full text-sm hover:bg-[#373c47] hover:text-white transition-colors"
          >
            Logout
          </button>
        </header>

        <div className="flex gap-8 items-start flex-col lg:flex-row">
          <div className="flex-1 min-w-0 w-full">
            <JewelleryStudio currentPrompt={currentPrompt} modelCentric={modelCentric} enhancedProduct={enhancedProduct} />
          </div>
          <div className="flex-[0_0_400px] min-w-0 w-full lg:w-[400px]">
            <PromptStudio 
              currentPrompt={currentPrompt} setCurrentPrompt={setCurrentPrompt}
              modelCentric={modelCentric} setModelCentric={setModelCentric}
              enhancedProduct={enhancedProduct} setEnhancedProduct={setEnhancedProduct}
            />
          </div>
        </div>
      </div>
    </>
  );
}
