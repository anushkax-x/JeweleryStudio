import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { buildGenerationJobs } from '../lib/photoGenerationPlan';
import { compressImageFile } from '../lib/compressImage';
import Card from './ui/Card';
import SectionLabel from './ui/SectionLabel';
import UploadZone from './ui/UploadZone';

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
    <div className="mb-8 rounded-xl bg-canvas px-4 py-3" role="status" aria-live="polite" aria-busy="true">
      <div className="mb-2 flex justify-between text-[0.8rem]">
        <span className="truncate text-ink">
          {completed} of {total}
          {label ? ` · ${label}` : ''}
        </span>
        <span className="shrink-0 tabular-nums text-muted">{formatElapsed(elapsed)}</span>
      </div>
      <div className="h-0.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(pct, completed > 0 ? 4 : 2)}%` }}
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
  modelPrompt,
  productPrompt,
  modelCount = 0,
  productCount = 0,
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
      const data = await runOnce();
      if (generationRunRef.current !== runId) return;
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
      setGenerationProgress({
        completed: 0,
        total: jobs.length,
        label: jobs[0].label,
        startedAt,
      });
    });

    const jobItems = jobs.map((job, index) => ({ job, index }));

    (async () => {
      await runPool(jobItems, PARALLEL_SLOTS, async ({ job, index }) => {
        if (generationRunRef.current !== runId) return;
        updateProgress(job.label);
        await generateImage(index, provider, job, runId, () => {
          if (generationRunRef.current !== runId) return;
          completedCount += 1;
          const nextJob = jobs[completedCount];
          updateProgress(nextJob?.label || job.label);
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
    const fetchModels = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/available-models`);
        const data = await res.json();
        if (data?.models?.length > 0) {
          setAvailableModels(data.models);
        }
      } catch (err) {
        console.error('Failed to fetch available models:', err);
      }
    };
    fetchModels();
  }, []);

  const isGenerating = loadingStates.some((l) => l);
  const canGenerate = mounted && Boolean(jewelleryImage) && !isGenerating && totalPics > 0;
  const showLoader = isGenerating || generationProgress != null;
  const showResults = loadingStates.some((l) => l) || images.some((img) => img);

  const modelIndices = Array.from({ length: Math.max(0, modelCount) }, (_, i) => i);
  const productIndices = Array.from({ length: Math.max(0, productCount) }, (_, i) => modelCount + i);

  const renderSlot = (index, label) => {
    const isLoading = loadingStates[index];
    const hasImage = Boolean(images[index]);
    return (
      <div
        key={`slot-${index}`}
        className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-canvas ring-1 ring-line"
      >
        {!hasImage ? (
          <div
            className="h-full w-full bg-gradient-to-r from-[#ebe7e0] via-[#f0ece6] to-[#ebe7e0] bg-[length:200%_100%] animate-shimmer"
            aria-label={isLoading ? 'Generating' : 'Waiting'}
          />
        ) : (
          <>
            <img src={images[index]} alt={label} className="h-full w-full object-cover animate-fade-in" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-ink/70 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                className="rounded-full bg-surface/95 px-4 py-1.5 text-[0.75rem] font-medium text-ink shadow-sm hover:bg-white"
                onClick={() => setEnlargedImage(images[index])}
              >
                Preview
              </button>
              <a
                className="rounded-full bg-surface/95 px-4 py-1.5 text-[0.75rem] font-medium text-ink no-underline shadow-sm hover:bg-white"
                href={images[index]}
                download={`anoree-${index + 1}.jpg`}
              >
                Download
              </a>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <Card>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[0.75rem] font-semibold text-surface">
            1
          </span>
          <h2 className="font-display text-xl font-medium text-ink">Upload references</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <UploadZone
            label="Jewellery"
            hint="The piece to photograph — used for all shots"
            preview={jewelleryImage}
            onChange={(e) => handleImageUpload(e, setJewelleryImage)}
          />
          <UploadZone
            label="Model reference"
            hint="Face or tone reference for editorial shots only"
            preview={modelImage}
            emptyLabel="Optional"
            optional
            onChange={(e) => handleImageUpload(e, setModelImage)}
          />
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[0.75rem] font-semibold text-surface">
            2
          </span>
          <h2 className="font-display text-xl font-medium text-ink">Piece details</h2>
        </div>

        <SectionLabel hint="Helps frame angles and product vs model shots">Jewellery type</SectionLabel>
        <select className="minimal-select field-input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Select type…</option>
          <option value="necklace">Necklace</option>
          <option value="necklace_set">Necklace set</option>
          <option value="earrings">Earrings</option>
          <option value="ring">Ring</option>
          <option value="bracelet">Bracelet</option>
        </select>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {totalPics === 0 ? (
            <p className="text-[0.85rem] text-muted">Set shot counts in Creative direction →</p>
          ) : (
            <p className="text-[0.85rem] text-muted">
              Ready to generate <span className="font-medium text-ink">{totalPics}</span> image
              {totalPics === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <button
          type="button"
          className={`rounded-full px-8 py-3.5 text-[0.9rem] font-medium tracking-wide transition-all ${
            canGenerate
              ? 'bg-ink text-surface shadow-lift hover:bg-accent-hover'
              : 'cursor-not-allowed bg-line text-subtle'
          }`}
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          {isGenerating ? `Generating…` : `Generate ${totalPics || 0} ${totalPics === 1 ? 'shot' : 'shots'}`}
        </button>
      </div>

      {showResults && (
        <Card className="!p-5 sm:!p-8">
          <h2 className="font-display mb-6 text-2xl font-medium text-ink">Gallery</h2>

          {showLoader && (
            <GenerationLoader
              completed={generationProgress?.completed ?? 0}
              total={generationProgress?.total ?? totalPics}
              label={generationProgress?.label ?? ''}
              startedAt={generationProgress?.startedAt}
            />
          )}

          {modelCount > 0 && (
            <div className="mb-10">
              <p className="mb-4 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-subtle">
                Editorial · on model
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {modelIndices.map((index) =>
                  renderSlot(index, slotLabels[index] || `Model ${index + 1}`),
                )}
              </div>
            </div>
          )}

          {productCount > 0 && (
            <div>
              <p className="mb-4 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-subtle">
                Product · studio packshot
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {productIndices.map((index) =>
                  renderSlot(index, slotLabels[index] || `Product ${index - modelCount + 1}`),
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {enlargedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-6 backdrop-blur-sm"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute -top-12 right-0 text-3xl text-surface/80 hover:text-surface"
              onClick={() => setEnlargedImage(null)}
              aria-label="Close"
            >
              ×
            </button>
            <img
              src={enlargedImage}
              alt="Preview"
              className="max-h-[90vh] max-w-full rounded-xl shadow-lift"
            />
          </div>
        </div>
      )}
    </div>
  );
}
