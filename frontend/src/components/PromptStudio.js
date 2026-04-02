import React, { useState, useEffect } from 'react';

export default function PromptStudio() {
  const [prompts, setPrompts] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [activePromptId, setActivePromptId] = useState(null);
  
  const [modelCentric, setModelCentric] = useState('2');
  const [enhancedProduct, setEnhancedProduct] = useState('1');

  const fetchPrompts = async () => {
    try {
      const res = await fetch('http://localhost:3001/prompts');
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
      await fetch('http://localhost:3001/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleAdd = () => {
    setActivePromptId(null);
    setCurrentTitle('');
    setCurrentPrompt('');
  };

  return (
    <div className="studio-card">
      <h2 className="studio-title">Prompt studio</h2>
      <p className="studio-subtitle">Configure output mix and manage saved prompts.</p>
      
      <div className="config-row">
        <div className="input-group">
          <label className="input-label">Model-centric</label>
          <input 
            type="number" 
            className="prompt-input" 
            style={{marginBottom: 0}}
            value={modelCentric}
            onChange={(e) => setModelCentric(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Enhanced product</label>
          <input 
            type="number" 
            className="prompt-input" 
            style={{marginBottom: 0}}
            value={enhancedProduct}
            onChange={(e) => setEnhancedProduct(e.target.value)}
          />
        </div>
        <div style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Total: {Number(modelCentric || 0) + Number(enhancedProduct || 0)}
        </div>
      </div>

      <div className="input-group">
        <label className="input-label">Preset</label>
        <select 
          className="styled-select" 
          style={{marginBottom: '1rem'}}
          value={activePromptId || ''}
          onChange={(e) => {
            const p = prompts.find(pr => pr.id === e.target.value);
            if (p) handleSelect(p);
          }}
        >
          <option value="" disabled>Select a preset...</option>
          {prompts.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label className="input-label">Preset name</label>
        <input 
          type="text" 
          className="prompt-input" 
          value={currentTitle} 
          onChange={(e) => setCurrentTitle(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label className="input-label">Prompt text</label>
        <textarea 
          className="prompt-textarea"
          rows={3}
          value={currentPrompt} 
          onChange={(e) => setCurrentPrompt(e.target.value)}
        ></textarea>
      </div>
      
      <div className="action-buttons">
        <button className="outline-btn" onClick={handleSave}>Save</button>
        <button className="outline-btn" onClick={handleAdd}>Add</button>
        <button className="outline-btn" onClick={fetchPrompts}>Refresh</button>
      </div>

      <h3 className="results-title">Saved prompts</h3>
      <div className="prompts-list">
        {prompts.map((p) => (
          <div 
            key={p.id} 
            className={`prompt-item ${activePromptId === p.id ? 'active' : ''}`}
            onClick={() => handleSelect(p)}
          >
            <h4 className="prompt-item-title">{p.title || 'Untitled'}</h4>
            <p className="prompt-item-text">{p.prompt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
