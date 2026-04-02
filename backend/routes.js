const fs = require('fs');
const path = require('path');

const promptsFilePath = path.join(__dirname, 'prompts.json');

module.exports = function (fastify) {
  if (!fs.existsSync(promptsFilePath)) {
    fs.writeFileSync(promptsFilePath, JSON.stringify([]));
  }

  fastify.get('/prompts', async (request, reply) => {
    const data = fs.readFileSync(promptsFilePath, 'utf8');
    return JSON.parse(data || '[]');
  });

  fastify.post('/prompts', async (request, reply) => {
    const { prompt, title, id } = request.body;
    let prompts = JSON.parse(fs.readFileSync(promptsFilePath, 'utf8') || '[]');
    
    if (id) {
      const idx = prompts.findIndex(p => p.id === id);
      if (idx !== -1) {
        prompts[idx].prompt = prompt;
        if (title) prompts[idx].title = title;
      }
      else prompts.push({ id, prompt, title: title || 'Untitled' });
    } else {
      prompts.push({ id: Date.now().toString(), prompt, title: title || 'Untitled' });
    }
    
    fs.writeFileSync(promptsFilePath, JSON.stringify(prompts));
    return { success: true };
  });

  fastify.post('/generate-image', async (request, reply) => {
    try {
      const { jewelleryImage, modelImage, prompt, type } = request.body;
      const key = process.env.GEMINI_API_KEY;
      const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-image-preview';

      if (!key) {
        return { imageUrl: 'https://placehold.co/400x500/222/f00?text=Missing+API+Key' };
      }

      const fullPrompt = `${prompt} Focus on high-end lifestyle editorial quality. Jewellery type: ${type||'product'}`;

      const parts = [{ text: fullPrompt }];

      if (jewelleryImage) {
        const split = jewelleryImage.split(',');
        if (split.length === 2) {
          const mimeType = split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || 'image/jpeg';
          parts.push({
            inline_data: { mime_type: mimeType, data: split[1] }
          });
        }
      }

      if (modelImage) {
        const split = modelImage.split(',');
        if (split.length === 2) {
          const mimeType = split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || 'image/jpeg';
          parts.push({
            inline_data: { mime_type: mimeType, data: split[1] }
          });
        }
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      
      const payload = {
        contents: [{ parts }]
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.error) {
        console.error("Gemini API Error:", data.error.message);
        return { imageUrl: `https://placehold.co/400x500/550/fff?text=${encodeURIComponent(data.error.message.substring(0,25))}` };
      }

      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        const part = data.candidates[0].content.parts[0];
        if (part.inlineData) {
          return { imageUrl: `data:${part.inlineData.mime_type || 'image/jpeg'};base64,${part.inlineData.data}` };
        } else if (part.text) {
          const text = part.text.trim();
          if (text.startsWith('iVBORw0K') || text.startsWith('/9j/')) {
            return { imageUrl: `data:image/jpeg;base64,${text}` };
          }
          console.error("Gemini returned text instead of image inline_data:", text);
          return { imageUrl: `https://placehold.co/400x500/222/fff?text=Model+returned+text` };
        }
      } else if (data && data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
         return { imageUrl: `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}` };
      }
      
      console.error('Unexpected Gemini Response', data);
      return { imageUrl: `https://placehold.co/400x500/222/fff?text=Unexpected+Format` };
    } catch (err) {
      console.error('Error generating image:', err);
      return { imageUrl: `https://placehold.co/400x500/222/f00?text=Backend+Error` };
    }
  });
};
