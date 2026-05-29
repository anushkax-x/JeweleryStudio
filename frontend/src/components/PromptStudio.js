import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_MODEL_PROMPT, DEFAULT_PRODUCT_PROMPT } from '../lib/promptDefaults';
import Card from './ui/Card';
import SectionLabel from './ui/SectionLabel';
import Counter from './ui/Counter';

const API_BASE_URL = '/api';

function applyPromptToForm(p, setters) {
  const { setMasterPrompt, setModelPrompt, setProductPrompt } = setters;
  setMasterPrompt(p.prompt ?? '');
  setModelPrompt(p.modelPrompt ?? DEFAULT_MODEL_PROMPT);
  setProductPrompt(p.productPrompt ?? DEFAULT_PRODUCT_PROMPT);
}

export default function PromptStudio({
  masterPrompt,
  setMasterPrompt,
  modelPrompt,
  setModelPrompt,
  productPrompt,
  setProductPrompt,
  modelCentric,
  setModelCentric,
  enhancedProduct,
  setEnhancedProduct,
}) {
  const [prompts, setPrompts] = useState([]);
  const [currentTitle, setCurrentTitle] = useState('');
  const [activePromptId, setActivePromptId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const didInitialSelect = useRef(false);

  const formSetters = { setMasterPrompt, setModelPrompt, setProductPrompt };

  const fetchPrompts = async (selectId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/prompts`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPrompts(data);
        if (selectId) {
          const match = data.find((pr) => String(pr.id) === String(selectId));
          if (match) {
            setActivePromptId(match.id);
            setCurrentTitle(match.title || '');
            applyPromptToForm(match, formSetters);
          }
        } else if (!didInitialSelect.current && data.length > 0) {
          didInitialSelect.current = true;
          const first = data[0];
          setActivePromptId(first.id);
          setCurrentTitle(first.title || '');
          applyPromptToForm(first, formSetters);
        }
      } else {
        setPrompts([]);
      }
    } catch (err) {
      console.error(err);
      setPrompts([]);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSelect = (p) => {
    setActivePromptId(p.id);
    setCurrentTitle(p.title || '');
    applyPromptToForm(p, formSetters);
    setSaveStatus('');
  };

  const handleSave = async () => {
    if (!masterPrompt.trim() || !currentTitle.trim()) return;
    setSaveStatus('');
    try {
      const res = await fetch(`${API_BASE_URL}/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: masterPrompt,
          modelPrompt: modelPrompt ?? '',
          productPrompt: productPrompt ?? '',
          title: currentTitle,
          id: activePromptId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus('Save failed');
        return;
      }
      if (data.prompt) {
        setActivePromptId(data.prompt.id);
        setCurrentTitle(data.prompt.title || '');
        applyPromptToForm(data.prompt, formSetters);
        await fetchPrompts(data.prompt.id);
      } else {
        await fetchPrompts(activePromptId);
      }
      setSaveStatus('Saved');
    } catch (err) {
      console.error(err);
      setSaveStatus('Save failed');
    }
  };

  const handleDelete = async () => {
    if (!activePromptId) return;
    try {
      await fetch(`${API_BASE_URL}/prompts/${activePromptId}`, { method: 'DELETE' });
      setActivePromptId(null);
      setCurrentTitle('');
      setMasterPrompt('');
      setModelPrompt(DEFAULT_MODEL_PROMPT);
      setProductPrompt(DEFAULT_PRODUCT_PROMPT);
      fetchPrompts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = () => {
    setActivePromptId(null);
    setCurrentTitle('');
    setMasterPrompt('');
    setModelPrompt(DEFAULT_MODEL_PROMPT);
    setProductPrompt(DEFAULT_PRODUCT_PROMPT);
    setSaveStatus('');
  };

  return (
    <Card className="animate-slide-up">
      <div className="mb-6 border-b border-line pb-5">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-accent">Creative direction</p>
        <h2 className="font-display mt-1 text-2xl font-medium text-ink">Prompt lab</h2>
      </div>

      <div className="mb-8 flex gap-8">
        <Counter label="Model shots" value={modelCentric} onChange={setModelCentric} />
        <Counter label="Product shots" value={enhancedProduct} onChange={setEnhancedProduct} />
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <SectionLabel>Preset</SectionLabel>
          <select
            className="minimal-select field-input"
            value={activePromptId || ''}
            onChange={(e) => {
              const p = prompts.find((pr) => String(pr.id) === e.target.value);
              if (p) handleSelect(p);
            }}
          >
            <option value="" disabled>
              Choose saved preset…
            </option>
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <SectionLabel>Preset name</SectionLabel>
          <input
            type="text"
            className="field-input"
            value={currentTitle}
            placeholder="Summer collection"
            onChange={(e) => setCurrentTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <SectionLabel hint="Lighting, mood, overall aesthetic">Master</SectionLabel>
          <textarea
            className="field-input field-textarea"
            rows={2}
            placeholder="Warm golden-hour light, soft shadows…"
            value={masterPrompt}
            onChange={(e) => setMasterPrompt(e.target.value)}
          />
        </div>

        <div>
          <SectionLabel hint="Framing and pose for on-model shots">Model</SectionLabel>
          <textarea
            className="field-input field-textarea"
            rows={2}
            placeholder="Chin-down crop, jewellery as hero…"
            value={modelPrompt}
            onChange={(e) => setModelPrompt(e.target.value)}
          />
        </div>

        <div>
          <SectionLabel hint="Packshot style on white">Product</SectionLabel>
          <textarea
            className="field-input field-textarea"
            rows={2}
            placeholder="Pure white studio, soft shadow…"
            value={productPrompt}
            onChange={(e) => setProductPrompt(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <button
          type="button"
          className="rounded-full bg-ink px-5 py-2.5 text-[0.85rem] font-medium text-surface transition-colors hover:bg-accent-hover"
          onClick={handleSave}
        >
          Save preset
        </button>
        <button
          type="button"
          className="text-[0.85rem] text-muted transition-colors hover:text-ink"
          onClick={handleAdd}
        >
          New
        </button>
        {saveStatus && (
          <span className={`text-[0.8rem] ${saveStatus === 'Saved' ? 'text-success' : 'text-danger'}`}>
            {saveStatus}
          </span>
        )}
        {activePromptId && (
          <button
            type="button"
            className="ml-auto text-[0.85rem] text-danger/80 hover:text-danger"
            onClick={handleDelete}
          >
            Delete
          </button>
        )}
      </div>

      {prompts.length > 0 && (
        <div className="mt-8">
          <SectionLabel>Library</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {prompts.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`rounded-full px-4 py-1.5 text-[0.8rem] transition-all ${
                  String(activePromptId) === String(p.id)
                    ? 'bg-ink text-surface'
                    : 'bg-canvas text-muted ring-1 ring-line hover:text-ink'
                }`}
                onClick={() => handleSelect(p)}
              >
                {p.title || 'Untitled'}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
