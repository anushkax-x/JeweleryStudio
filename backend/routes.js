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
        
      const prompts = snapshot.docs.map(doc => doc.data());
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

  fastify.post('/generate-image', async (request, reply) => {
    try {
      const { jewelleryImage, modelImage, prompt, type } = request.body;
      const key = process.env.GEMINI_API_KEY;
      const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-image-preview';

      if (!key) {
        return { imageUrl: 'https://placehold.co/400x500/222/f00?text=Missing+API+Key' };
      }

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(key);
      const aiModel = genAI.getGenerativeModel({ model: modelName });

      const fullPrompt = `${prompt} Focus on high-end lifestyle editorial quality. Jewellery type: ${type||'product'}`;
      const promptParts = [fullPrompt];

      if (jewelleryImage) {
        const split = jewelleryImage.split(',');
        if (split.length === 2) {
          const mimeType = split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || 'image/jpeg';
          promptParts.push({
            inlineData: { mimeType: mimeType, data: split[1] }
          });
        }
      }

      if (modelImage) {
        const split = modelImage.split(',');
        if (split.length === 2) {
          const mimeType = split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || 'image/jpeg';
          promptParts.push({
            inlineData: { mimeType: mimeType, data: split[1] }
          });
        }
      }

      const result = await aiModel.generateContent(promptParts);
      const data = result.response;
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        const part = data.candidates[0].content.parts[0];
        if (part.inlineData) {
          return { imageUrl: `data:${part.inlineData.mime_type || part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}` };
        } else if (part.text) {
          const text = part.text.trim();
          if (text.startsWith('iVBORw0K') || text.startsWith('/9j/')) {
            return { imageUrl: `data:image/jpeg;base64,${text}` };
          }
          fastify.log.error("Gemini returned text instead of image inline_data:", text);
          return { imageUrl: `https://placehold.co/400x500/222/fff?text=Model+returned+text` };
        }
      }
      
      fastify.log.error('Unexpected Gemini Response Structure');
      return { imageUrl: `https://placehold.co/400x500/222/fff?text=Unexpected+Format` };
      
    } catch (err) {
      fastify.log.error('Error generating image via SDK:', err);
      return { imageUrl: `https://placehold.co/400x500/222/f00?text=Timeout+or+Error` };
    }
  });
};
