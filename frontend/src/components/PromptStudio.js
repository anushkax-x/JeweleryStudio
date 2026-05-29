import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_MODEL_PROMPT, DEFAULT_PRODUCT_PROMPT } from '../lib/promptDefaults';
import Card from './ui/Card';
import StepHeader from './ui/StepHeader';
import Counter from './ui/Counter';

const API_BASE_URL = '/api';

function applyPromptToForm(p, setters) {
  const { setMasterPrompt, setModelPrompt, setProductPrompt } = setters;
  setMasterPrompt(p.prompt ?? '');
  setModelPrompt(p.modelPrompt ?? DEFAULT_MODEL_PROMPT);
  setProductPrompt(p.productPrompt ?? DEFAULT_PRODUCT_PROMPT);
}

function FieldLabel({ children }) {
  return (
    <p className="mb-1.5 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-subtle">{children}</p>
  );
}

export default function PromptStudio({
  embedded = false,
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
        setSaveStatus('Failed');
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
      setSaveStatus('Failed');
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

  const field = 'field-input !py-2 !text-[0.84rem] !bg-[#faf9f7]';
  const textarea = `${field} field-textarea !min-h-[4.5rem]`;

  const embeddedBody = (
    <>
      <StepHeader step={3} title="Prompt lab">
        <div className="flex gap-5">
          <Counter compact label="Model" value={modelCentric} onChange={setModelCentric} />
          <Counter compact label="Product" value={enhancedProduct} onChange={setEnhancedProduct} />
        </div>
      </StepHeader>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Preset</FieldLabel>
          <select
            className={`minimal-select ${field}`}
            value={activePromptId || ''}
            onChange={(e) => {
              const p = prompts.find((pr) => String(pr.id) === e.target.value);
              if (p) handleSelect(p);
            }}
          >
            <option value="" disabled>
              Load preset…
            </option>
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Name</FieldLabel>
          <input
            type="text"
            className={field}
            value={currentTitle}
            placeholder="e.g. Summer"
            onChange={(e) => setCurrentTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <FieldLabel>Master</FieldLabel>
          <textarea
            className={textarea}
            rows={2}
            placeholder="Light & mood"
            value={masterPrompt}
            onChange={(e) => setMasterPrompt(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Model</FieldLabel>
          <textarea
            className={textarea}
            rows={2}
            placeholder="Framing"
            value={modelPrompt}
            onChange={(e) => setModelPrompt(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Product</FieldLabel>
          <textarea
            className={textarea}
            rows={2}
            placeholder="Packshot"
            value={productPrompt}
            onChange={(e) => setProductPrompt(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          className="rounded-lg bg-canvas px-4 py-2 text-[0.78rem] font-medium text-ink ring-1 ring-line transition-colors hover:bg-surface"
          onClick={handleSave}
        >
          Save preset
        </button>
        <button type="button" className="btn-ghost" onClick={handleAdd}>
          New
        </button>
        {saveStatus && (
          <span className={`text-[0.72rem] ${saveStatus === 'Saved' ? 'text-success' : 'text-danger'}`}>
            {saveStatus}
          </span>
        )}
        {activePromptId && (
          <button type="button" className="btn-ghost ml-auto text-danger/90 hover:text-danger" onClick={handleDelete}>
            Delete
          </button>
        )}
      </div>

      {prompts.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
          {prompts.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`rounded-md px-2.5 py-1 text-[0.72rem] transition-all ${
                String(activePromptId) === String(p.id)
                  ? 'bg-ink text-surface'
                  : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
              onClick={() => handleSelect(p)}
            >
              {p.title || 'Untitled'}
            </button>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) {
    return embeddedBody;
  }

  return <Card className="animate-slide-up p-6 sm:p-8">{embeddedBody}</Card>;
}
