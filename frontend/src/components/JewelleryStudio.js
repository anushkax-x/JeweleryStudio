import React, { useState } from 'react';

export default function JewelleryStudio() {
  const [jewelleryImage, setJewelleryImage] = useState(null);
  const [modelImage, setModelImage] = useState(null);
  const [type, setType] = useState('');
  const [images, setImages] = useState([]);
  const [loadingStates, setLoadingStates] = useState([false, false, false]);

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
      const res = await fetch('http://localhost:3001/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jewelleryImage, modelImage, type, prompt: 'Generate photoshoot' }),
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
    setImages([null, null, null]);
    setLoadingStates([true, true, true]);
    for (let i = 0; i < 3; i++) {
        generateImage(i);
    }
  };

  const canGenerate = jewelleryImage && !loadingStates.some(l => l);

  return (
    <>
      <div className="section-box">
        <h2 className="section-title">Your jewellery photos</h2>
        <div className="button-row">
          <label className="outline-btn">
            Add jewellery pictures
            <input type="file" accept="image/*" onChange={handleJewelleryUpload} />
          </label>
          <span className="status-pill">{jewelleryImage ? '1 image added' : 'No images yet'}</span>
        </div>
      </div>

      <div className="section-box">
        <h2 className="section-title">Model face references (optional)</h2>
        <p className="section-subtitle">Add one or more face/context images for female model shots. Product shots ignore these images.</p>
        <div className="button-row">
          <label className="outline-btn">
            Add face / context images
            <input type="file" accept="image/*" onChange={handleModelUpload} />
          </label>
          <span className="status-pill">{modelImage ? 'Image added' : 'None'}</span>
        </div>
      </div>

      <div className="section-box">
        <h2 className="section-title">Jewellery type</h2>
        <select className="styled-select" value={type} onChange={e => setType(e.target.value)}>
          <option value="">Select type...</option>
          <option value="necklace">Necklace</option>
          <option value="earrings">Earrings</option>
          <option value="ring">Ring</option>
          <option value="bracelet">Bracelet</option>
        </select>
      </div>

      <button 
        className={`generate-btn ${canGenerate ? 'active' : ''}`} 
        onClick={handleGenerate} 
        disabled={!canGenerate}
      >
        {loadingStates.some(l => l) ? 'Generating...' : 'Generate pictures'}
      </button>

      {(loadingStates.some(l => l) || images.some(img => img)) && (
        <div className="images-grid">
          {loadingStates.map((isLoading, index) => (
            <div key={index} className="image-wrapper">
              {isLoading ? (
                <div className="shimmer-loader"></div>
              ) : images[index] ? (
                <img src={images[index]} alt={`Generated ${index}`} className="generated-image fade-in" />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
