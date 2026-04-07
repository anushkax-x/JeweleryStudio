const fs = require('fs');
const path = require('path');

const PROMPTS_PATH = path.join(__dirname, 'prompts.json');

function loadPrompts() {
  const raw = fs.readFileSync(PROMPTS_PATH, 'utf8');
  const arr = JSON.parse(raw);
  return arr.map((p) => ({
    ...p,
    id: String(p.id),
  }));
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
      const { prompt, title, id } = request.body;
      const prompts = loadPrompts();
      const promptId = id != null && id !== '' ? String(id) : String(Date.now());
      const idx = prompts.findIndex((p) => String(p.id) === promptId);
      const promptData = {
        id: promptId,
        prompt,
        title: title || 'Untitled',
      };
      if (idx >= 0) {
        prompts[idx] = { ...prompts[idx], ...promptData };
      } else {
        prompts.push(promptData);
      }
      savePrompts(prompts);
      return { success: true };
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
    try {
      const {
        jewelleryImage,
        modelImage,
        prompt,
        type,
        model,
        shotMode,
        productFocus,
        modelVariation,
        clientSlotIndex,
        clientRunId,
      } = request.body;

      const baseRaw = (prompt || 'Luxury jewellery').trim();
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

      const antiSplit =
        ' FORBIDDEN LAYOUTS (must never appear): split-screen, top/bottom split, left/right split, diptych, triptych, collage, magazine spread, before/after, comparison, story layout, or any second photo embedded in the frame. FORBIDDEN: picture-in-picture, inset thumbnail, floating secondary image, side-by-side panels.';

      const noCollage = ` Output must be exactly ONE single continuous photograph filling the entire frame.${antiSplit} Do not create grids, contact sheets, or multiple scenes in one image.`;

      const modelShotExtra =
        ` SINGLE SCENE ONLY: one editorial photograph of a real woman wearing the jewellery.${noCollage} The reference jewellery image must NEVER be pasted, tiled, or shown as a separate studio/white-background panel inside this output — only recreate the jewellery on the model in one unified shot. Framing is STRICTLY chin-down: crop at or below the lower lip/chin — zero eyes, eyebrows, forehead, nose bridge, or full face. Show only neck, throat, décolleté, shoulders, collarbone, ears. If a face reference is provided, use only for tone; still no visible face above the chin. Shallow depth of field; jewellery is the hero.`;

      const productShotExtra =
        `TASK: ONE studio PRODUCT PHOTO only.${noCollage} Full-frame #ffffff background; soft contact shadow; unworn jewellery only (flat or suspended). ZERO humans, ZERO skin, ZERO fabric, ZERO room, ZERO outdoor scene.${antiSplit} ZERO logos, ZERO brand names, ZERO text, ZERO watermarks. Macro sharp.`;

      let fullPrompt;
      if (shotMode === 'product') {
        const focus = (productFocus || 'Reproduce the uploaded jewellery accurately.').trim();
        const style = sanitizeProductStyleNotes(baseRaw) || 'clean luxury finish';
        fullPrompt = `${productShotExtra}

CRITICAL: The reference may show a person or mixed layout — IGNORE that. Use the reference ONLY to copy the jewellery design, stones, and metal. Output must be a single packshot on pure white — not a composite, not a split, not worn.

Subject: ${focus}
Jewellery type context: ${piece}.
Lighting / mood (packshot only): ${style}`;
      } else {
        const variation = (modelVariation || 'Chin-down crop; jewellery dominant.').trim();
        const modelStyle = sanitizeModelStyleNotes(baseRaw) || baseRaw;
        fullPrompt = `${modelStyle} ${modelShotExtra} Angle / pose: ${variation}`;
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
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const geminiSystem = [
          'You generate exactly ONE photograph per request.',
          'Never output split-screen, diptychs, collages, magazine layouts, before/after, or picture-in-picture.',
          'Never embed a second photograph or inset inside the frame.',
          'If reference images are provided, use them only for design continuity — do not paste them as separate panels.',
        ].join(' ');
        const aiModel = genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-image-preview',
          systemInstruction: geminiSystem,
        });

        let promptParts;
        if (shotMode === 'product' && jewelleryImage) {
          const split = jewelleryImage.split(',');
          const refLabel =
            'REFERENCE (design extraction only): The next image may show a person, split layout, or mixed scene — IGNORE all of that. Copy only the jewellery design, then output ONE unworn full-frame packshot on pure #ffffff. No humans, no split, no logo, no text.';
          if (split.length === 2) {
            const mimeType =
              split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || 'image/jpeg';
            promptParts = [fullPrompt, refLabel, { inlineData: { mimeType: mimeType, data: split[1] } }];
          } else {
            promptParts = [fullPrompt];
          }
        } else {
          promptParts = [fullPrompt];
          if (jewelleryImage) {
            const split = jewelleryImage.split(',');
            if (split.length === 2) {
              const mimeType =
                split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || 'image/jpeg';
              const modelJewelleryRef =
                'REFERENCE (design only — NOT an output panel): The next image may be a packshot on white or a worn shot. Do NOT composite it as a second tile, inset, or split. Generate ONE new chin-down photo of a model wearing this exact jewellery; the reference must not appear as a separate picture inside the result.';
              promptParts.push(modelJewelleryRef);
              promptParts.push({ inlineData: { mimeType: mimeType, data: split[1] } });
            }
          }
        }

        const useModelRef = shotMode !== 'product' && modelImage;
        if (useModelRef) {
          const split = modelImage.split(',');
          if (split.length === 2) {
            const mimeType =
              split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || 'image/jpeg';
            promptParts.push({ inlineData: { mimeType: mimeType, data: split[1] } });
          }
        }

        const result = await aiModel.generateContent(promptParts);
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
      fastify.log.error('Error generating image via SDK:', err);
      const { clientSlotIndex, clientRunId } = request.body || {};
      return {
        imageUrl: `https://placehold.co/400x500/222/f00?text=Timeout+or+Error`,
        ...(clientSlotIndex !== undefined && clientSlotIndex !== null
          ? { clientSlotIndex, clientRunId }
          : {}),
      };
    }
  });
};
