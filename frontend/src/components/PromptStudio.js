import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PromptStudio({ 
  currentPrompt, setCurrentPrompt,
  modelCentric, setModelCentric,
  enhancedProduct, setEnhancedProduct 
}) {
  const [prompts, setPrompts] = useState([]);
  const [currentTitle, setCurrentTitle] = useState('');
  const [activePromptId, setActivePromptId] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const fetchPrompts = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/prompts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setPrompts(data);
      if (data.length > 0 && !activePromptId) {
        handleSelect(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSelect = (p) => {
    setActivePromptId(p.id);
    setCurrentTitle(p.title || '');
    setCurrentPrompt(p.prompt);
  };

  const handleSave = async () => {
    if (!currentPrompt.trim() || !currentTitle.trim()) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      await fetch(`${API_BASE_URL}/prompts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          prompt: currentPrompt, 
          title: currentTitle,
          id: activePromptId 
        }),
      });
      fetchPrompts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!activePromptId) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      await fetch(`${API_BASE_URL}/prompts/${activePromptId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setActivePromptId(null);
      setCurrentTitle('');
      setCurrentPrompt('');
      fetchPrompts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = () => {
    setActivePromptId(null);
    setCurrentTitle('');
    setCurrentPrompt('');
  };

  return (
    <div className="bg-bg-card border border-border-color rounded-[12px] p-8">
      <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Prompt lab</h2>
        </div>
        <div className={`text-[1.2rem] text-text-secondary transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-6 fade-in">
          
          <div className="flex gap-6 border-b border-white/5 pb-4">
            <div>
              <label className="block text-[0.7rem] uppercase tracking-wider text-[#7a8294] mb-1.5 font-medium">Model touch</label>
              <div className="flex items-center border-b border-border-color w-[90px] py-0.5 transition-colors duration-300 focus-within:border-brand">
                <button className="bg-transparent text-[#7a8294] border-none cursor-pointer text-[1.1rem] px-2 select-none hover:text-white" onClick={() => setModelCentric(Math.max(0, modelCentric - 1))}>−</button>
                <input 
                  type="number" 
                  className="bg-transparent border-none text-white text-[0.95rem] w-full text-center focus:outline-none [-moz-appearance:textfield] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={modelCentric}
                  onChange={(e) => setModelCentric(Number(e.target.value) || 0)}
                />
                <button className="bg-transparent text-[#7a8294] border-none cursor-pointer text-[1.1rem] px-2 select-none hover:text-white" onClick={() => setModelCentric(modelCentric + 1)}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-[0.7rem] uppercase tracking-wider text-[#7a8294] mb-1.5 font-medium">Product focus</label>
              <div className="flex items-center border-b border-border-color w-[90px] py-0.5 transition-colors duration-300 focus-within:border-brand">
                <button className="bg-transparent text-[#7a8294] border-none cursor-pointer text-[1.1rem] px-2 select-none hover:text-white" onClick={() => setEnhancedProduct(Math.max(0, enhancedProduct - 1))}>−</button>
                <input 
                  type="number" 
                  className="bg-transparent border-none text-white text-[0.95rem] w-full text-center focus:outline-none [-moz-appearance:textfield] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={enhancedProduct}
                  onChange={(e) => setEnhancedProduct(Number(e.target.value) || 0)}
                />
                <button className="bg-transparent text-[#7a8294] border-none cursor-pointer text-[1.1rem] px-2 select-none hover:text-white" onClick={() => setEnhancedProduct(enhancedProduct + 1)}>+</button>
              </div>
            </div>
          </div>

          <div className="flex gap-6 mt-6 pb-0 border-none">
            <div className="flex-1">
              <label className="block text-[0.7rem] uppercase tracking-wider text-[#7a8294] mb-1.5 font-medium">Load Prompt</label>
              <select 
                className="minimal-select w-full bg-transparent border-b border-border-color text-white text-[0.95rem] py-1 focus:outline-none focus:border-brand"
                value={activePromptId || ''}
                onChange={(e) => {
                  const p = prompts.find(pr => pr.id === e.target.value);
                  if (p) handleSelect(p);
                }}
              >
                <option value="" disabled className="bg-bg-dark text-white">Custom</option>
                {prompts.map(p => (
                  <option key={p.id} value={p.id} className="bg-bg-dark text-white">{p.title}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-[0.7rem] uppercase tracking-wider text-[#7a8294] mb-1.5 font-medium">Prompt name</label>
              <input 
                type="text" 
                className="w-full bg-transparent border-none border-b border-border-color text-white text-[0.95rem] py-1 focus:outline-none focus:border-brand" 
                value={currentTitle} 
                placeholder="E.g. Summer Collection"
                onChange={(e) => setCurrentTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[0.7rem] uppercase tracking-wider text-[#7a8294] mb-1.5 font-medium">Master Prompt</label>
            <textarea 
              className="w-full resize-y leading-relaxed text-[0.85rem] border border-border-color rounded-lg p-3 bg-black/15 text-white focus:outline-none focus:border-brand"
              rows={4}
              placeholder="Describe the aesthetic..."
              value={currentPrompt} 
              onChange={(e) => setCurrentPrompt(e.target.value)}
            ></textarea>
          </div>
          
          <div className="flex gap-4 items-center mt-6 pt-4 border-t border-white/5">
            <button className="bg-[#2a2e38] text-gray-300 border border-[#3b404d] px-5 py-2 rounded-full font-medium text-[0.85rem] cursor-pointer transition-all duration-200 hover:bg-[#373c47] hover:text-white hover:border-[#4a5060] hover:-translate-y-[1px]" onClick={handleSave}>Save changes</button>
            <button className="bg-transparent text-text-secondary border-none text-[0.85rem] cursor-pointer transition-colors duration-200 hover:text-white" onClick={handleAdd}>+ New prompt</button>
            {activePromptId && (
              <button 
                className="bg-transparent border-none text-[0.85rem] cursor-pointer transition-colors duration-200 ml-auto hover:text-red-400 text-red-500" 
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
          </div>

          <div className="mt-10">
            <label className="block text-[0.7rem] uppercase tracking-wider text-[#7a8294] mb-[1.25rem] font-medium">
              Saved Library
            </label>
            <div className="flex flex-wrap gap-[0.85rem]">
              {prompts.map((p) => (
                <button 
                  key={p.id} 
                  className={`px-5 py-2 rounded-full text-[0.85rem] cursor-pointer transition-all duration-200 ${activePromptId === p.id ? 'bg-brand text-white border border-brand' : 'bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'}`}
                  onClick={() => handleSelect(p)}
                >
                  {p.title || 'Untitled'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
