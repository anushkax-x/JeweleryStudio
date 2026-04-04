import React, { useState } from 'react';
import { auth } from '../lib/firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function JewelleryStudio({ currentPrompt, modelCentric, enhancedProduct }) {
  const [jewelleryImage, setJewelleryImage] = useState(null);
  const [modelImage, setModelImage] = useState(null);
  const [type, setType] = useState('');
  const [images, setImages] = useState([]);
  const [loadingStates, setLoadingStates] = useState([]);
  const [enlargedImage, setEnlargedImage] = useState(null);

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

  const generateImage = async (index) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/generate-image`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jewelleryImage, modelImage, type, prompt: currentPrompt || 'Generate photoshoot' }),
      });
      const data = await res.json();
      
      setImages(prev => {
        const newImages = [...prev];
        newImages[index] = data.imageUrl;
        return newImages;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStates(prev => {
        const newLoadings = [...prev];
        newLoadings[index] = false;
        return newLoadings;
      });
    }
  };

  const handleGenerate = () => {
    const numToGenerate = Math.max(1, (modelCentric || 0) + (enhancedProduct || 0));
    setImages(Array(numToGenerate).fill(null));
    setLoadingStates(Array(numToGenerate).fill(true));
    for (let i = 0; i < numToGenerate; i++) {
        generateImage(i);
    }
  };

  const [mounted, setMounted] = useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const canGenerate = mounted && Boolean(jewelleryImage) && !loadingStates.some(l => l);

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
        {loadingStates.some(l => l) ? 'Generating...' : 'Generate pictures'}
      </button>

      {(loadingStates.some(l => l) || images.some(img => img)) && (
        <div className="grid grid-cols-3 gap-4 mt-8">
          {loadingStates.map((isLoading, index) => (
            <div key={index} className="aspect-[4/5] bg-bg-box rounded-[10px] overflow-hidden relative border border-border-color group">
              {isLoading ? (
                <div className="w-full h-full bg-gradient-to-r from-[#2d313a] via-[#3b404d] to-[#2d313a] bg-[length:200%_100%] animate-shimmer"></div>
              ) : images[index] ? (
                <>
                  <img src={images[index]} alt={`Generated ${index}`} className="w-full h-full object-cover fade-in" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex gap-2 justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button className="bg-white/20 border border-white/40 text-white px-3 py-1.5 rounded-full text-[0.8rem] cursor-pointer backdrop-blur-sm hover:bg-white/30" onClick={() => setEnlargedImage(images[index])}>Preview</button>
                    <a className="bg-white/20 border border-white/40 text-white px-3 py-1.5 rounded-full text-[0.8rem] cursor-pointer backdrop-blur-sm hover:bg-white/30 no-underline" href={images[index]} download={`generated-${index}.jpg`}>Download</a>
                  </div>
                </>
              ) : null}
            </div>
          ))}
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
