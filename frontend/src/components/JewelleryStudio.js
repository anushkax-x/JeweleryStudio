import React, { useState, useRef } from 'react';
import { buildGenerationJobs } from '../lib/photoGenerationPlan';

const API_BASE_URL = '/api';

export default function JewelleryStudio({
  masterPrompt,
  modelPrompt,
  productPrompt,
  modelCount = 0,
  productCount = 0,
}) {
  /** Increments each Generate click so late responses from an older run cannot write into the grid. */
  const generationRunRef = useRef(0);
  const [jewelleryImage, setJewelleryImage] = useState(null);
  const [modelImage, setModelImage] = useState(null);
  const [type, setType] = useState('');
  const [images, setImages] = useState([]);
  const [loadingStates, setLoadingStates] = useState([]);
  const [slotLabels, setSlotLabels] = useState([]);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [availableModels, setAvailableModels] = useState(['gemini']);
  const [genProgress, setGenProgress] = useState(null);

  const handleJewelleryUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => setJewelleryImage(ev.target.result);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleModelUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => setModelImage(ev.target.result);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const generateImage = async (index, modelName, job, runId) => {
    const isProduct = job.shotMode === 'product';
    const body = {
      jewelleryImage,
      modelImage: isProduct ? null : modelImage,
      type,
      masterPrompt: masterPrompt || 'Luxury jewellery photoshoot',
      modelPrompt,
      productPrompt,
      model: modelName,
      shotMode: job.shotMode,
      productFocus: job.productFocus,
      modelVariation: job.modelVariation,
      clientSlotIndex: index,
      clientRunId: runId,
    };

    const runOnce = async () => {
      const res = await fetch(`${API_BASE_URL}/generate-image`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`generate-image failed (${res.status}): ${text.slice(0, 200)}`);
      }
      return JSON.parse(text);
    };

    try {
      let data = await runOnce();
      if (data.imageUrl && String(data.imageUrl).includes('placehold.co')) {
        await new Promise((r) => setTimeout(r, 900));
        data = await runOnce();
      }
      if (generationRunRef.current !== runId) {
        return;
      }
      if (data.clientSlotIndex !== undefined && data.clientSlotIndex !== index) {
        console.warn('Slot mismatch from API; ignoring frame', { expected: index, got: data.clientSlotIndex });
        return;
      }
      setImages((prev) => {
        const next = [...prev];
        next[index] = data.imageUrl;
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (generationRunRef.current !== runId) {
        return;
      }
      setLoadingStates((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }
  };

  const totalPics = Math.max(0, modelCount) + Math.max(0, productCount);

  const handleGenerate = () => {
    const jobs = buildGenerationJobs(type, { modelCount, productCount });
    const provider = availableModels[0] || 'gemini';
    const runId = ++generationRunRef.current;

    setSlotLabels(jobs.map((j) => j.label));
    setImages(Array(jobs.length).fill(null));
    setLoadingStates(Array(jobs.length).fill(true));
    setGenProgress({ current: 0, total: jobs.length, label: jobs[0]?.label || '' });

    // One image at a time — Gemini can take 1–2+ minutes per call.
    (async () => {
      for (let index = 0; index < jobs.length; index += 1) {
        if (generationRunRef.current !== runId) {
          setGenProgress(null);
          return;
        }
        setGenProgress({
          current: index + 1,
          total: jobs.length,
          label: jobs[index].label,
        });
        await generateImage(index, provider, jobs[index], runId);
      }
      if (generationRunRef.current === runId) {
        setGenProgress(null);
      }
    })();
  };

  const [mounted, setMounted] = useState(false);
  
  React.useEffect(() => {
    setMounted(true);
    const fetchModels = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/available-models`);
        const data = await res.json();
        if (data && data.models && data.models.length > 0) {
          setAvailableModels(data.models);
        }
      } catch (err) {
        console.error('Failed to fetch available models:', err);
      }
    };
    fetchModels();
  }, []);

  const canGenerate =
    mounted && Boolean(jewelleryImage) && !loadingStates.some((l) => l) && totalPics > 0;

  const modelIndices = Array.from({ length: Math.max(0, modelCount) }, (_, i) => i);
  const productIndices = Array.from(
    { length: Math.max(0, productCount) },
    (_, i) => modelCount + i,
  );

  const renderSlot = (index, label) => {
    const isLoading = loadingStates[index];
    const hasImage = Boolean(images[index]);
    return (
      <div
        key={`slot-${index}`}
        className="aspect-[4/5] bg-bg-box rounded-[10px] overflow-hidden relative border border-border-color group"
      >
        {!hasImage ? (
          <div
            className="w-full h-full bg-gradient-to-r from-[#2d313a] via-[#3b404d] to-[#2d313a] bg-[length:200%_100%] animate-shimmer"
            aria-label={isLoading ? 'Loading' : 'Waiting for image'}
          />
        ) : (
          <>
            <img src={images[index]} alt={label} className="w-full h-full object-cover fade-in" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex gap-2 justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <button
                type="button"
                className="bg-white/20 border border-white/40 text-white px-3 py-1.5 rounded-full text-[0.8rem] cursor-pointer backdrop-blur-sm hover:bg-white/30"
                onClick={() => setEnlargedImage(images[index])}
              >
                Preview
              </button>
              <a
                className="bg-white/20 border border-white/40 text-white px-3 py-1.5 rounded-full text-[0.8rem] cursor-pointer backdrop-blur-sm hover:bg-white/30 no-underline"
                href={images[index]}
                download={`shot-${index + 1}.jpg`}
              >
                Download
              </a>
            </div>
          </>
        )}
      </div>
    );
  };

  const svgArrow = "data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%228%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1.41%200L6%204.58L10.59%200L12%201.41l-6%206-6-6z%22%20fill%3D%22%23a0a6b5%22%2F%3E%3C%2Fsvg%3E";

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-bg-box rounded-[10px] p-6 border border-border-color">
        <h2 className="text-[1.1rem] text-text-primary mb-2 font-semibold">Your jewellery photos</h2>
        <div className="flex items-center gap-3">
          <label className="bg-transparent text-text-primary border border-brand rounded-full px-4 py-2 text-[0.85rem] cursor-pointer transition hover:bg-[#709af01a] relative overflow-hidden">
            Add jewellery pictures
            <input type="file" accept="image/*" onChange={handleJewelleryUpload} className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" />
          </label>
          {jewelleryImage ? (
            <img src={jewelleryImage} alt="Jewellery preview" className="w-8 h-8 rounded object-cover border border-border-color" />
          ) : (
            <span className="bg-[#3b404d] text-text-secondary px-3 py-1.5 rounded-full text-[0.8rem]">No images yet</span>
          )}
        </div>
      </div>

      <div className="bg-bg-box rounded-[10px] p-6 border border-border-color">
        <h2 className="text-[1.1rem] text-text-primary mb-1 font-semibold">Model face references (optional)</h2>
        <p className="text-text-secondary text-[0.85rem] mb-4">Add one or more face/context images for female model shots. Product shots ignore these images.</p>
        <div className="flex items-center gap-3">
          <label className="bg-transparent text-text-primary border border-brand rounded-full px-4 py-2 text-[0.85rem] cursor-pointer transition hover:bg-[#709af01a] relative overflow-hidden">
            Add face / context images
            <input type="file" accept="image/*" onChange={handleModelUpload} className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" />
          </label>
          {modelImage ? (
            <img src={modelImage} alt="Model preview" className="w-8 h-8 rounded object-cover border border-border-color" />
          ) : (
            <span className="bg-[#3b404d] text-text-secondary px-3 py-1.5 rounded-full text-[0.8rem]">None</span>
          )}
        </div>
      </div>

      <div className="bg-bg-box rounded-[10px] p-6 border border-border-color">
        <h2 className="text-[1.1rem] text-text-primary mb-2 font-semibold">Jewellery type</h2>
        <select 
          className="w-full px-4 py-3 bg-bg-dark border border-border-color text-text-primary rounded-[10px] text-[0.9rem] appearance-none bg-no-repeat bg-[right_1rem_center]" 
          style={{ backgroundImage: `url('${svgArrow}')` }}
          value={type} 
          onChange={e => setType(e.target.value)}
        >
          <option value="">Select type...</option>
          <option value="necklace">Necklace</option>
          <option value="necklace_set">Necklace set (necklace + earrings)</option>
          <option value="earrings">Earrings</option>
          <option value="ring">Ring</option>
          <option value="bracelet">Bracelet</option>
        </select>
      </div>

      <button 
        className={`border-none rounded-full px-8 py-3 text-[0.95rem] self-start mt-2 font-medium ${canGenerate ? 'bg-brand text-white cursor-pointer hover:bg-[#8ab0ff]' : 'bg-[#3b404d] text-text-secondary cursor-not-allowed'}`} 
        onClick={handleGenerate} 
        disabled={!canGenerate}
      >
        {loadingStates.some((l) => l)
          ? `Generating ${totalPics} image${totalPics === 1 ? '' : 's'}…`
          : `Generate ${totalPics} pic${totalPics === 1 ? '' : 's'}`}
      </button>

      {genProgress && genProgress.total > 0 && (
        <div className="mt-4 p-4 bg-bg-box border border-border-color rounded-[10px]" role="status" aria-live="polite">
          <div className="flex justify-between items-center gap-4 mb-2">
            <span className="text-[0.85rem] text-text-primary font-medium">
              Image {genProgress.current} of {genProgress.total}
            </span>
            <span className="text-[0.8rem] text-text-secondary truncate">{genProgress.label}</span>
          </div>
          <div className="h-2 bg-[#2d313a] rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${Math.round((genProgress.current / genProgress.total) * 100)}%`,
              }}
            />
          </div>
          <p className="text-[0.75rem] text-text-secondary mt-2">
            Each image can take 1–2 minutes. Please keep this tab open.
          </p>
        </div>
      )}

      {totalPics === 0 && (
        <p className="text-text-secondary text-[0.85rem] mt-1">
          Set Model touch and Product focus counts in Prompt lab (at least one).
        </p>
      )}

      {(loadingStates.some((l) => l) || images.some((img) => img)) && (
        <div className="mt-8 space-y-10">
          {modelCount > 0 && (
            <div>
              <h3 className="text-[0.75rem] uppercase tracking-wider text-[#7a8294] mb-3 font-medium">
                Model · close editorial (jewellery hero)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modelIndices.map((index) =>
                  renderSlot(index, slotLabels[index] || `Model · ${index + 1}`),
                )}
              </div>
            </div>
          )}
          {productCount > 0 && (
            <div>
              <h3 className="text-[0.75rem] uppercase tracking-wider text-[#7a8294] mb-3 font-medium">
                Product · white background, soft shadow
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {productIndices.map((index) =>
                  renderSlot(index, slotLabels[index] || `Product · ${index - modelCount + 1}`),
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {enlargedImage && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999]" onClick={() => setEnlargedImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button className="absolute -top-10 right-0 bg-transparent border-none text-white text-3xl cursor-pointer" onClick={() => setEnlargedImage(null)}>&times;</button>
            <img src={enlargedImage} alt="Enlarged preview" className="max-w-full max-h-[90vh] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)]" />
          </div>
        </div>
      )}
    </div>
  );
}
