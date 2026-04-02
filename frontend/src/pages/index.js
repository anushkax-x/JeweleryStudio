import Head from "next/head";
import JewelleryStudio from "../components/JewelleryStudio";
import PromptStudio from "../components/PromptStudio";

export default function Home() {
  return (
    <>
      <Head>
        <title>Aura | Jewellery Photoshoot Studio</title>
      </Head>
      <div className="max-w-[1100px] mx-auto py-8 px-[3%]">
        <header className="mb-8">
          <h1 className="text-[1.8rem] font-semibold text-text-primary tracking-tight mb-2">Aura</h1>
          <p className="text-[0.95rem] text-text-secondary">AI Jewellery Photoshoot Studio</p>
        </header>

        <div className="flex gap-8 items-start flex-col lg:flex-row">
          <div className="flex-1 min-w-0 w-full">
            <JewelleryStudio />
          </div>
          <div className="flex-[0_0_400px] min-w-0 w-full lg:w-[400px]">
            <PromptStudio />
          </div>
        </div>
      </div>
    </>
  );
}
