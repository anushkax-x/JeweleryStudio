import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { buildGenerationJobs } from '../lib/photoGenerationPlan';
import { compressImageFile } from '../lib/compressImage';
import Card from './ui/Card';
import StepHeader from './ui/StepHeader';
import UploadZone from './ui/UploadZone';
import PromptStudio from './PromptStudio';

const API_BASE_URL = '/api';
const PARALLEL_SLOTS = 2;

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function GenerationLoader({ completed, total, label, startedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = startedAt || Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const safeTotal = Math.max(1, total);
  const pct = Math.round((completed / safeTotal) * 100);

  return (
    <div className="mb-6 rounded-lg bg-canvas/80 px-4 py-3 ring-1 ring-line" role="status" aria-live="polite">
      <div className="mb-2 flex justify-between text-[0.78rem]">
        <span className="truncate text-ink">
          {completed} of {total}
          {label ? ` · ${label}` : ''}
        </span>
        <span className="shrink-0 tabular-nums text-subtle">{formatElapsed(elapsed)}</span>
      </div>
      <div className="h-px overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(pct, completed > 0 ? 3 : 1)}%` }}
        />
      </div>
    </div>
  );
}

async function runPool(items, concurrency, worker) {
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const i = nextIndex;
      nextIndex += 1;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

export default function JewelleryStudio({
  masterPrompt,
  setMasterPrompt,
  modelPrompt,
  setModelPrompt,
  productPrompt,
  setProductPrompt,
  modelCount = 0,
  setModelCount,
  productCount = 0,
  setProductCount,
}) {
  const generationRunRef = useRef(0);
  const [jewelleryImage, setJewelleryImage] = useState(null);
  const [modelImage, setModelImage] = useState(null);
  const [type, setType] = useState('');
  const [images, setImages] = useState([]);
  const [loadingStates, setLoadingStates] = useState([]);
  const [slotLabels, setSlotLabels] = useState([]);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [availableModels, setAvailableModels] = useState(['gemini']);
  const [generationProgress, setGenerationProgress] = useState(null);

  const handleImageUpload = async (e, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setter(compressed);
    } catch (err) {
      console.error('Image compress failed, using original:', err);
      const reader = new FileReader();
      reader.onload = (ev) => setter(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async (index, modelName, job, runId, onComplete) => {
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
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`generate-image failed (${res.status}): ${text.slice(0, 200)}`);
      return JSON.parse(text);
    };

    try {
      const data = await runOnce();
      if (generationRunRef.current !== runId) return;
      if (data.clientSlotIndex !== undefined && data.clientSlotIndex !== index) return;
      setImages((prev) => {
        const next = [...prev];
        next[index] = data.imageUrl;
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (generationRunRef.current !== runId) return;
      setLoadingStates((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
      onComplete?.(index, job);
    }
  };

  const totalPics = Math.max(0, modelCount) + Math.max(0, productCount);

  const handleGenerate = () => {
    const jobs = buildGenerationJobs(type, { modelCount, productCount });
    if (jobs.length === 0) return;

    const provider = availableModels[0] || 'gemini';
    const runId = ++generationRunRef.current;
    const startedAt = Date.now();
    let completedCount = 0;

    const updateProgress = (label) => {
      flushSync(() => {
        setGenerationProgress({
          completed: completedCount,
          total: jobs.length,
          label,
          startedAt,
        });
      });
    };

    flushSync(() => {
      setSlotLabels(jobs.map((j) => j.label));
      setImages(Array(jobs.length).fill(null));
      setLoadingStates(Array(jobs.length).fill(true));
      setGenerationProgress({ completed: 0, total: jobs.length, label: jobs[0].label, startedAt });
    });

    const jobItems = jobs.map((job, index) => ({ job, index }));

    (async () => {
      await runPool(jobItems, PARALLEL_SLOTS, async ({ job, index }) => {
        if (generationRunRef.current !== runId) return;
        updateProgress(job.label);
        await generateImage(index, provider, job, runId, () => {
          if (generationRunRef.current !== runId) return;
          completedCount += 1;
          updateProgress(jobs[completedCount]?.label || job.label);
        });
      });

      if (generationRunRef.current === runId) {
        flushSync(() => {
          setGenerationProgress({
            completed: jobs.length,
            total: jobs.length,
            label: '',
            startedAt,
          });
        });
        setTimeout(() => setGenerationProgress(null), 1200);
      }
    })();
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch(`${API_BASE_URL}/available-models`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.models?.length > 0) setAvailableModels(data.models);
      })
      .catch(console.error);
  }, []);

  const isGenerating = loadingStates.some((l) => l);
  const canGenerate = mounted && Boolean(jewelleryImage) && !isGenerating && totalPics > 0;
  const showLoader = isGenerating || generationProgress != null;
  const showResults = loadingStates.some((l) => l) || images.some((img) => img);

  const modelIndices = Array.from({ length: Math.max(0, modelCount) }, (_, i) => i);
  const productIndices = Array.from({ length: Math.max(0, productCount) }, (_, i) => modelCount + i);

  const renderSlot = (index, label) => {
    const hasImage = Boolean(images[index]);
    return (
      <div
        key={`slot-${index}`}
        className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-canvas ring-1 ring-line"
      >
        {!hasImage ? (
          <div
            className="h-full w-full bg-gradient-to-r from-[#f0ece6] via-[#f8f6f2] to-[#f0ece6] bg-[length:200%_100%] animate-shimmer"
            aria-label={loadingStates[index] ? 'Generating' : 'Waiting'}
          />
        ) : (
          <>
            <img src={images[index]} alt={label} className="h-full w-full object-cover animate-fade-in" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-ink/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button
                type="button"
                className="rounded-md bg-surface/95 px-3 py-1 text-[0.7rem] font-medium text-ink backdrop-blur-sm"
                onClick={() => setEnlargedImage(images[index])}
              >
                View
              </button>
              <a
                className="rounded-md bg-surface/95 px-3 py-1 text-[0.7rem] font-medium text-ink no-underline backdrop-blur-sm"
                href={images[index]}
                download={`anoree-${index + 1}.jpg`}
              >
                Save
              </a>
            </div>
          </>
        )}
      </div>
    );
  };

  const sectionPad = 'px-6 py-7 sm:px-8 sm:py-8';
  const split = showResults;

  const galleryPanel = (
    <Card className="!p-0 overflow-hidden shadow-inset lg:sticky lg:top-5 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <div className="border-b border-line px-6 py-5 sm:px-8">
        <h2 className="font-display text-[1.5rem] font-medium text-ink">Gallery</h2>
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-7">
        {showLoader && (
          <GenerationLoader
            completed={generationProgress?.completed ?? 0}
            total={generationProgress?.total ?? totalPics}
            label={generationProgress?.label ?? ''}
            startedAt={generationProgress?.startedAt}
          />
        )}
        {modelCount > 0 && (
          <div className={productCount > 0 ? 'mb-8' : ''}>
            <p className="mb-3 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-subtle">Editorial</p>
            <div className="grid grid-cols-2 gap-2.5">
              {modelIndices.map((index) => renderSlot(index, slotLabels[index] || `Model ${index + 1}`))}
            </div>
          </div>
        )}
        {productCount > 0 && (
          <div>
            <p className="mb-3 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-subtle">Product</p>
            <div className="grid grid-cols-2 gap-2.5">
              {productIndices.map((index) =>
                renderSlot(index, slotLabels[index] || `Product ${index - modelCount + 1}`),
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  const formColumn = (
    <div className={`space-y-5 ${split ? 'min-w-0' : 'mx-auto max-w-2xl'}`}>
      <Card className="overflow-hidden !p-0 shadow-inset">
        <section className={sectionPad}>
          <StepHeader step={1} title="References" />
          <div className="grid gap-3 sm:grid-cols-2">
            <UploadZone
              label="Jewellery"
              hint="Used for every shot in this run"
              preview={jewelleryImage}
              onChange={(e) => handleImageUpload(e, setJewelleryImage)}
            />
            <UploadZone
              label="Model"
              hint="Tone reference for editorial shots"
              preview={modelImage}
              emptyLabel="Optional"
              optional
              onChange={(e) => handleImageUpload(e, setModelImage)}
            />
          </div>
        </section>

        <div className="studio-divider" />

        <section className={sectionPad}>
          <StepHeader step={2} title="Piece">
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <label className="shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-subtle">
                Type
              </label>
              <select
                className="minimal-select field-input min-w-0 sm:min-w-[11rem]"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">Select…</option>
                <option value="necklace">Necklace</option>
                <option value="necklace_set">Necklace set</option>
                <option value="earrings">Earrings</option>
                <option value="ring">Ring</option>
                <option value="bracelet">Bracelet</option>
              </select>
            </div>
          </StepHeader>
        </section>

        <div className="studio-divider" />

        <section className={sectionPad}>
          <PromptStudio
            embedded
            masterPrompt={masterPrompt}
            setMasterPrompt={setMasterPrompt}
            modelPrompt={modelPrompt}
            setModelPrompt={setModelPrompt}
            productPrompt={productPrompt}
            setProductPrompt={setProductPrompt}
            modelCentric={modelCount}
            setModelCentric={setModelCount}
            enhancedProduct={productCount}
            setEnhancedProduct={setProductCount}
          />
        </section>
      </Card>

      <div className="rounded-2xl border border-line/80 bg-surface px-6 py-6 text-center shadow-card sm:px-8">
        {totalPics === 0 ? (
          <p className="mb-4 text-[0.85rem] text-muted">Add at least one shot in Prompt lab</p>
        ) : (
          <p className="mb-4 text-[0.85rem] text-muted">
            <span className="font-medium text-ink">{totalPics}</span> images ready to generate
          </p>
        )}
        <button type="button" className="btn-primary w-full sm:w-auto" onClick={handleGenerate} disabled={!canGenerate}>
          {isGenerating ? 'Generating…' : `Generate ${totalPics || 0} ${totalPics === 1 ? 'shot' : 'shots'}`}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`animate-slide-up ${split ? 'grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-6' : ''}`}
    >
      {formColumn}

      {split && <div className="min-w-0 animate-slide-up">{galleryPanel}</div>}

      {enlargedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/88 p-6 backdrop-blur-md"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-h-[92vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute -right-1 -top-10 text-2xl text-surface/70 transition-colors hover:text-surface"
              onClick={() => setEnlargedImage(null)}
              aria-label="Close"
            >
              ×
            </button>
            <img
              src={enlargedImage}
              alt="Preview"
              className="max-h-[92vh] max-w-full rounded-lg shadow-lift ring-1 ring-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
