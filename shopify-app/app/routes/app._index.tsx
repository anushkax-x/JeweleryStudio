import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import JewelleryStudio from "../components/JewelleryStudio";
import PromptStudio from "../components/PromptStudio";
import anoreeStyles from "../styles/anoree.css?url";

export const links = () => [{ rel: "stylesheet", href: anoreeStyles }];

export const meta: MetaFunction = () => {
  return [{ title: "Anoree | Jewellery Photoshoot Studio" }];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function AppIndex() {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [modelCentric, setModelCentric] = useState(2);
  const [enhancedProduct, setEnhancedProduct] = useState(1);

  return (
    <div className="max-w-[1100px] mx-auto py-8 px-[3%]">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-[1.8rem] font-semibold text-text-primary tracking-tight mb-2">
              Anoree
            </h1>
            <p className="text-[0.95rem] text-text-secondary">
              AI Jewellery Photoshoot Studio
            </p>
          </div>
        </header>

        <div className="flex gap-8 items-start flex-col lg:flex-row">
          <div className="flex-1 min-w-0 w-full">
            <JewelleryStudio currentPrompt={currentPrompt} />
          </div>
          <div className="flex-[0_0_400px] min-w-0 w-full lg:w-[400px]">
            <PromptStudio
              currentPrompt={currentPrompt}
              setCurrentPrompt={setCurrentPrompt}
              modelCentric={modelCentric}
              setModelCentric={setModelCentric}
              enhancedProduct={enhancedProduct}
              setEnhancedProduct={setEnhancedProduct}
            />
          </div>
        </div>
    </div>
  );
}
