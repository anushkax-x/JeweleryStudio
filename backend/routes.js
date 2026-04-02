const fs = require('fs');
const path = require('path');

const promptsFilePath = path.join(__dirname, 'prompts.json');

module.exports = function (fastify) {
  // Initialize prompts.json if it doesn't exist
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

  // Simulated image generation using the provided keys
  fastify.post('/generate-image', async (request, reply) => {
    const { jewelleryImage, modelImage, prompt } = request.body;
    // const geminiKey = process.env.GEMINI_API_KEY;
    // const bananaKey = process.env.NANO_BANANA_KEY;

    // Simulate delay for image generation latency
    const delay = 1500 + Math.random() * 2000;
    await new Promise(res => setTimeout(res, delay));
    
    // We append random seed to ensure unique dummy images
    return { 
      imageUrl: `https://picsum.photos/seed/${Date.now() + Math.random()}/400/500` 
    };
  });
};
