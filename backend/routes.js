const path = require('path');
const { admin, db } = require('./firebaseAdmin');

module.exports = function (fastify) {
  
  // Middleware to protect routes and assign request.user
  fastify.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      request.user = decodedToken;
    } catch (err) {
      fastify.log.error(err);
      reply.code(401).send({ error: 'Unauthorized: Invalid token' });
    }
  });

  fastify.get('/prompts', async (request, reply) => {
    try {
      const snapshot = await db.collection('users')
        .doc(request.user.uid)
        .collection('prompts')
        .get();
        
      let prompts = snapshot.docs.map(doc => doc.data());

      // If they have no prompts, seed their database with the defaults from prompts.json
      if (prompts.length === 0) {
        const fs = require('fs');
        const defaultPromptsPath = path.join(__dirname, 'prompts.json');
        
        if (fs.existsSync(defaultPromptsPath)) {
          const defaultPrompts = JSON.parse(fs.readFileSync(defaultPromptsPath, 'utf8'));
          
          const batch = db.batch();
          defaultPrompts.forEach(p => {
            const docRef = db.collection('users').doc(request.user.uid).collection('prompts').doc(String(p.id));
            batch.set(docRef, { ...p, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          });
          
          await batch.commit();
          prompts = defaultPrompts;
        }
      }

      return prompts;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Error fetching prompts' });
    }
  });

  fastify.post('/prompts', async (request, reply) => {
    try {
      const { prompt, title, id } = request.body;
      const promptId = id || Date.now().toString();
      
      const promptData = {
        id: promptId,
        prompt,
        title: title || 'Untitled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('users')
        .doc(request.user.uid)
        .collection('prompts')
        .doc(promptId)
        .set(promptData, { merge: true });

      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Error saving prompt' });
    }
  });

  fastify.delete('/prompts/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      await db.collection('users')
        .doc(request.user.uid)
        .collection('prompts')
        .doc(id)
        .delete();

      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Error deleting prompt' });
    }
  });

  fastify.get('/available-models', async (request, reply) => {
    const models = [];
    if (process.env.GEMINI_API_KEY) models.push('gemini');
    if (process.env.OPENAI_API_KEY) models.push('openai');
    if (process.env.REPLICATE_API_TOKEN) models.push('replicate');
    if (process.env.STABILITY_API_KEY) models.push('stability');
    
    // If no keys are present, return an empty array
    return { models };
  });

  fastify.post('/generate-image', async (request, reply) => {
    try {
      const { jewelleryImage, modelImage, prompt, type, model } = request.body;
      const fullPrompt = `${prompt} Focus on high-end lifestyle editorial quality. Jewellery type: ${type||'product'}`;
      
      let imageUrl = null;

      if (model === 'openai' && process.env.OPENAI_API_KEY) {
        const { OpenAI } = require('openai');
        const openai = new OpenAI();
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: fullPrompt,
          n: 1,
          size: "1024x1024",
        });
        imageUrl = response.data[0].url;
      } 
      else if (model === 'replicate' && process.env.REPLICATE_API_TOKEN) {
        const Replicate = require('replicate');
        const replicate = new Replicate();
        
        let input = { prompt: fullPrompt };
        
        const output = await replicate.run(
          "black-forest-labs/flux-1.1-pro",
          { input }
        );
        imageUrl = Array.isArray(output) ? output[0] : output;
      } 
      else if (model === 'stability' && process.env.STABILITY_API_KEY) {
        const formData = new FormData();
        formData.append('prompt', fullPrompt);
        formData.append('output_format', 'jpeg');
        
        const res = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
            'Accept': 'image/*'
          },
          body: formData
        });

        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          imageUrl = `data:image/jpeg;base64,${base64}`;
        } else {
          fastify.log.error('Stability API error:', await res.text());
          throw new Error('Stability Error');
        }
      } 
      else if (model === 'gemini' && process.env.GEMINI_API_KEY) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const aiModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-image-preview' });

        const promptParts = [fullPrompt];

        if (jewelleryImage) {
          const split = jewelleryImage.split(',');
          if (split.length === 2) {
            const mimeType = split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || 'image/jpeg';
            promptParts.push({ inlineData: { mimeType: mimeType, data: split[1] } });
          }
        }

        if (modelImage) {
          const split = modelImage.split(',');
          if (split.length === 2) {
            const mimeType = split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || 'image/jpeg';
            promptParts.push({ inlineData: { mimeType: mimeType, data: split[1] } });
          }
        }

        const result = await aiModel.generateContent(promptParts);
        const data = result.response;
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          const part = data.candidates[0].content.parts[0];
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mime_type || part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
          } else if (part.text) {
            const text = part.text.trim();
            if (text.startsWith('iVBORw0K') || text.startsWith('/9j/')) {
              imageUrl = `data:image/jpeg;base64,${text}`;
            }
          }
        }
      }

      if (imageUrl) {
        return { imageUrl };
      } else {
        return { imageUrl: `https://placehold.co/400x500/222/f00?text=Model+Not+Configured+Or+Failed` };
      }
      
    } catch (err) {
      fastify.log.error('Error generating image via SDK:', err);
      return { imageUrl: `https://placehold.co/400x500/222/f00?text=Timeout+or+Error` };
    }
  });
};
