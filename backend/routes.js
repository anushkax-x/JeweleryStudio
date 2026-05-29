const fs = require('fs');
const path = require('path');
const { enqueueGeneration } = require('./generationQueue');

const PROMPTS_PATH = path.join(__dirname, 'prompts.json');

function normalizePrompt(p, { forSave = false } = {}) {
  const base = {
    ...p,
    id: String(p.id),
    title: p.title || 'Untitled',
    prompt: typeof p.prompt === 'string' ? p.prompt : '',
  };
  if (forSave || p.modelPrompt != null) {
    base.modelPrompt = typeof p.modelPrompt === 'string' ? p.modelPrompt : '';
  }
  if (forSave || p.productPrompt != null) {
    base.productPrompt = typeof p.productPrompt === 'string' ? p.productPrompt : '';
  }
  return base;
}

function loadPrompts() {
  const raw = fs.readFileSync(PROMPTS_PATH, 'utf8');
  const arr = JSON.parse(raw);
  return arr.map(normalizePrompt);
}

function savePrompts(prompts) {
  fs.writeFileSync(PROMPTS_PATH, JSON.stringify(prompts, null, 2), 'utf8');
}

module.exports = function (fastify) {
  fastify.get('/prompts', async (request, reply) => {
    try {
      return loadPrompts();
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Error fetching prompts' });
    }
  });

  fastify.post('/prompts', async (request, reply) => {
    try {
      const { prompt, modelPrompt, productPrompt, title, id } = request.body;
      const prompts = loadPrompts();
      const promptId = id != null && id !== '' ? String(id) : String(Date.now());
      const idx = prompts.findIndex((p) => String(p.id) === promptId);
      const promptData = normalizePrompt(
        {
          id: promptId,
          prompt: typeof prompt === 'string' ? prompt : '',
          modelPrompt: typeof modelPrompt === 'string' ? modelPrompt : '',
          productPrompt: typeof productPrompt === 'string' ? productPrompt : '',
          title: title || 'Untitled',
        },
        { forSave: true },
      );
      if (idx >= 0) {
        prompts[idx] = promptData;
      } else {
        prompts.push(promptData);
      }
      savePrompts(prompts);
      return { success: true, prompt: promptData };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Error saving prompt' });
    }
  });

  fastify.delete('/prompts/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const filtered = loadPrompts().filter((p) => String(p.id) !== String(id));
      savePrompts(filtered);
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

    return { models };
  });

  fastify.post('/generate-image', async (request, reply) => {
    return enqueueGeneration(() => handleGenerateImage(request, reply));
  });
};

async function handleGenerateImage(request, reply) {
    try {
      const {
        jewelleryImage,
        modelImage,
        prompt,
        masterPrompt,
        modelPrompt,
        productPrompt,
        type,
        model,
        shotMode,
        productFocus,
        modelVariation,
        clientSlotIndex,
        clientRunId,
      } = request.body;

      const masterRaw = (masterPrompt || prompt || 'Luxury jewellery').trim();
      const modelSpecsRaw = (modelPrompt || '').trim();
      const productSpecsRaw = (productPrompt || '').trim();
      const piece = type || 'jewellery';

      /** Strip words that make product shots drift toward worn/editorial imagery. */
      function sanitizeProductStyleNotes(text) {
        return text
          .replace(
            /\b(model|models|woman|women|girl|lady|face|portrait|wearing|wear|worn|editorial|lifestyle|runway|saree|sari|skin|modeling|split|diptych|collage|logo|brand|watermark|text)\b/gi,
            ' '
          )
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 400);
      }

      /** User prompts often mention "catalogue / white / product" — that triggers split before/after layouts in image models. */
      function sanitizeModelStyleNotes(text) {
        return text
          .replace(
            /\b(packshot|pack shot|flat lay|flatlay|white background|pure white|#fff|#ffffff|e-?commerce|product shot|product photo|catalogue|catalog|grid|split|split-?screen|diptych|triptych|before and after|comparison|inset|PIP|picture-?in-?picture|magazine|layout|banner|duo|dual panel)\b/gi,
            ' '
          )
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 400);
      }

      const ONE_PHOTO_RULE =
        'ONE full-frame photograph only — no split-screen, diptych, collage, inset, or picture-in-picture.';

      const modelShotExtra =
        `Editorial photo: woman wearing the jewellery. ${ONE_PHOTO_RULE} Recreate jewellery from reference in-scene (never paste reference as a panel). Chin-down crop only — neck, décolleté, ears; no eyes or full face. Jewellery is hero.`;

      const productShotExtra =
        `Studio packshot on #ffffff. ${ONE_PHOTO_RULE} Unworn jewellery only; soft shadow; no humans, skin, fabric, room, logos, or text.`;

      let fullPrompt;
      if (shotMode === 'product') {
        const focus = (productFocus || 'Reproduce the uploaded jewellery accurately.').trim();
        const theme = sanitizeProductStyleNotes(masterRaw) || 'clean luxury finish';
        const shotSpecs =
          productSpecsRaw ||
          'Studio packshot on pure white; unworn jewellery only; soft contact shadow.';
        fullPrompt = `${productShotExtra}
Use reference for jewellery design only (ignore any person in reference).
Subject: ${focus}
Jewellery type context: ${piece}.
Overall theme / lighting: ${theme}
Product shot specifications: ${shotSpecs}`;
      } else {
        const variation = (modelVariation || 'Chin-down crop; jewellery dominant.').trim();
        const theme = sanitizeModelStyleNotes(masterRaw) || masterRaw;
        const shotSpecs =
          modelSpecsRaw ||
          'Editorial chin-down crop; jewellery as hero; one woman wearing the piece.';
        fullPrompt = `${theme}

Model shot specifications: ${shotSpecs}
${modelShotExtra}
Angle / pose: ${variation}`;
      }

      let imageUrl = null;

      if (model === 'openai' && process.env.OPENAI_API_KEY) {
        const { OpenAI } = require('openai');
        const openai = new OpenAI();
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: fullPrompt,
          n: 1,
          size: '1024x1024',
        });
        imageUrl = response.data[0].url;
      } else if (model === 'replicate' && process.env.REPLICATE_API_TOKEN) {
        const Replicate = require('replicate');
        const replicate = new Replicate();

        const input = { prompt: fullPrompt };

        const output = await replicate.run('black-forest-labs/flux-1.1-pro', { input });
        imageUrl = Array.isArray(output) ? output[0] : output;
      } else if (model === 'stability' && process.env.STABILITY_API_KEY) {
        const formData = new FormData();
        formData.append('prompt', fullPrompt);
        formData.append('output_format', 'jpeg');

        const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
            Accept: 'image/*',
          },
          body: formData,
        });

        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          imageUrl = `data:image/jpeg;base64,${base64}`;
        } else {
          fastify.log.error('Stability API error:', await res.text());
          throw new Error('Stability Error');
        }
      } else if (model === 'gemini' && process.env.GEMINI_API_KEY) {
        const genStarted = Date.now();
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const geminiSystem =
          'Generate exactly ONE photograph per request. No split-screen, collage, or inset panels. References are for design continuity only.';
        const aiModel = genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-image-preview',
          systemInstruction: geminiSystem,
        });

        const promptParts = [fullPrompt];
        const appendInline = (dataUrl) => {
          const split = dataUrl.split(',');
          if (split.length !== 2) return;
          const mimeType =
            split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || 'image/jpeg';
          promptParts.push({ inlineData: { mimeType, data: split[1] } });
        };

        if (jewelleryImage) {
          appendInline(jewelleryImage);
        }
        if (shotMode !== 'product' && modelImage) {
          appendInline(modelImage);
        }

        const result = await aiModel.generateContent(promptParts);
        request.server.log.info(
          { slot: clientSlotIndex, ms: Date.now() - genStarted },
          'Gemini generateContent finished'
        );
        const data = result.response;

        const firstPart =
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts &&
          data.candidates[0].content.parts[0];

        if (firstPart) {
          if (firstPart.inlineData) {
            imageUrl = `data:${firstPart.inlineData.mime_type || firstPart.inlineData.mimeType || 'image/jpeg'};base64,${firstPart.inlineData.data}`;
          } else if (firstPart.text) {
            const text = firstPart.text.trim();
            if (text.startsWith('iVBORw0K') || text.startsWith('/9j/')) {
              imageUrl = `data:image/jpeg;base64,${text}`;
            }
          }
        }
        if (!imageUrl && data.candidates && data.candidates[0]) {
          fastify.log.warn(
            'Gemini returned no image; finishReason=%s',
            data.candidates[0].finishReason || 'unknown'
          );
        }
      }

      const meta =
        clientSlotIndex !== undefined && clientSlotIndex !== null
          ? { clientSlotIndex, clientRunId }
          : {};

      if (imageUrl) {
        return { imageUrl, ...meta };
      } else {
        return {
          imageUrl: `https://placehold.co/400x500/222/f00?text=Model+Not+Configured+Or+Failed`,
          ...meta,
        };
      }
    } catch (err) {
      request.server.log.error({ err }, 'Error generating image via SDK');
      const { clientSlotIndex, clientRunId } = request.body || {};
      return {
        imageUrl: `https://placehold.co/400x500/222/f00?text=Timeout+or+Error`,
        ...(clientSlotIndex !== undefined && clientSlotIndex !== null
          ? { clientSlotIndex, clientRunId }
          : {}),
      };
    }
}
