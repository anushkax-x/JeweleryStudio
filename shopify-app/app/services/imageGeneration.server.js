/**
 * Image generation logic ported from backend/routes.js
 */

function sanitizeProductStyleNotes(text) {
  return text
    .replace(
      /\b(model|models|woman|women|girl|lady|face|portrait|wearing|wear|worn|editorial|lifestyle|runway|saree|sari|skin|modeling|split|diptych|collage|logo|brand|watermark|text)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

function sanitizeModelStyleNotes(text) {
  return text
    .replace(
      /\b(packshot|pack shot|flat lay|flatlay|white background|pure white|#fff|#ffffff|e-?commerce|product shot|product photo|catalogue|catalog|grid|split|split-?screen|diptych|triptych|before and after|comparison|inset|PIP|picture-?in-?picture|magazine|layout|banner|duo|dual panel)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

function buildFullPrompt({
  prompt,
  type,
  shotMode,
  productFocus,
  modelVariation,
}) {
  const baseRaw = (prompt || "Luxury jewellery").trim();
  const piece = type || "jewellery";

  const antiSplit =
    " FORBIDDEN LAYOUTS (must never appear): split-screen, top/bottom split, left/right split, diptych, triptych, collage, magazine spread, before/after, comparison, story layout, or any second photo embedded in the frame. FORBIDDEN: picture-in-picture, inset thumbnail, floating secondary image, side-by-side panels.";

  const noCollage = ` Output must be exactly ONE single continuous photograph filling the entire frame.${antiSplit} Do not create grids, contact sheets, or multiple scenes in one image.`;

  const modelShotExtra = ` SINGLE SCENE ONLY: one editorial photograph of a real woman wearing the jewellery.${noCollage} The reference jewellery image must NEVER be pasted, tiled, or shown as a separate studio/white-background panel inside this output — only recreate the jewellery on the model in one unified shot. Framing is STRICTLY chin-down: crop at or below the lower lip/chin — zero eyes, eyebrows, forehead, nose bridge, or full face. Show only neck, throat, décolleté, shoulders, collarbone, ears. If a face reference is provided, use only for tone; still no visible face above the chin. Shallow depth of field; jewellery is the hero.`;

  const productShotExtra = `TASK: ONE studio PRODUCT PHOTO only.${noCollage} Full-frame #ffffff background; soft contact shadow; unworn jewellery only (flat or suspended). ZERO humans, ZERO skin, ZERO fabric, ZERO room, ZERO outdoor scene.${antiSplit} ZERO logos, ZERO brand names, ZERO text, ZERO watermarks. Macro sharp.`;

  if (shotMode === "product") {
    const focus = (productFocus || "Reproduce the uploaded jewellery accurately.").trim();
    const style = sanitizeProductStyleNotes(baseRaw) || "clean luxury finish";
    return `${productShotExtra}

CRITICAL: The reference may show a person or mixed layout — IGNORE that. Use the reference ONLY to copy the jewellery design, stones, and metal. Output must be a single packshot on pure white — not a composite, not a split, not worn.

Subject: ${focus}
Jewellery type context: ${piece}.
Lighting / mood (packshot only): ${style}`;
  }

  const variation = (modelVariation || "Chin-down crop; jewellery dominant.").trim();
  const modelStyle = sanitizeModelStyleNotes(baseRaw) || baseRaw;
  return `${modelStyle} ${modelShotExtra} Angle / pose: ${variation}`;
}

async function generateWithOpenAI(fullPrompt) {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI();
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: fullPrompt,
    n: 1,
    size: "1024x1024",
  });
  return response.data[0].url;
}

async function generateWithReplicate(fullPrompt) {
  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate();
  const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
    input: { prompt: fullPrompt },
  });
  return Array.isArray(output) ? output[0] : output;
}

async function generateWithStability(fullPrompt) {
  const formData = new FormData();
  formData.append("prompt", fullPrompt);
  formData.append("output_format", "jpeg");

  const res = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      Accept: "image/*",
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Stability Error: ${await res.text()}`);
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/jpeg;base64,${base64}`;
}

async function generateWithGemini({
  fullPrompt,
  shotMode,
  jewelleryImage,
  modelImage,
}) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const geminiSystem = [
    "You generate exactly ONE photograph per request.",
    "Never output split-screen, diptychs, collages, magazine layouts, before/after, or picture-in-picture.",
    "Never embed a second photograph or inset inside the frame.",
    "If reference images are provided, use them only for design continuity — do not paste them as separate panels.",
  ].join(" ");

  const aiModel = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-image-preview",
    systemInstruction: geminiSystem,
  });

  let promptParts;
  if (shotMode === "product" && jewelleryImage) {
    const split = jewelleryImage.split(",");
    const refLabel =
      "REFERENCE (design extraction only): The next image may show a person, split layout, or mixed scene — IGNORE all of that. Copy only the jewellery design, then output ONE unworn full-frame packshot on pure #ffffff. No humans, no split, no logo, no text.";
    if (split.length === 2) {
      const mimeType =
        split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || "image/jpeg";
      promptParts = [
        fullPrompt,
        refLabel,
        { inlineData: { mimeType, data: split[1] } },
      ];
    } else {
      promptParts = [fullPrompt];
    }
  } else {
    promptParts = [fullPrompt];
    if (jewelleryImage) {
      const split = jewelleryImage.split(",");
      if (split.length === 2) {
        const mimeType =
          split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || "image/jpeg";
        const modelJewelleryRef =
          "REFERENCE (design only — NOT an output panel): The next image may be a packshot on white or a worn shot. Do NOT composite it as a second tile, inset, or split. Generate ONE new chin-down photo of a model wearing this exact jewellery; the reference must not appear as a separate picture inside the result.";
        promptParts.push(modelJewelleryRef);
        promptParts.push({ inlineData: { mimeType, data: split[1] } });
      }
    }
  }

  const useModelRef = shotMode !== "product" && modelImage;
  if (useModelRef) {
    const split = modelImage.split(",");
    if (split.length === 2) {
      const mimeType =
        split[0].match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)?.[1] || "image/jpeg";
      promptParts.push({ inlineData: { mimeType, data: split[1] } });
    }
  }

  const result = await aiModel.generateContent(promptParts);
  const data = result.response;
  const firstPart =
    data.candidates?.[0]?.content?.parts?.[0];

  if (firstPart?.inlineData) {
    const mime =
      firstPart.inlineData.mime_type ||
      firstPart.inlineData.mimeType ||
      "image/jpeg";
    return `data:${mime};base64,${firstPart.inlineData.data}`;
  }

  if (firstPart?.text) {
    const text = firstPart.text.trim();
    if (text.startsWith("iVBORw0K") || text.startsWith("/9j/")) {
      return `data:image/jpeg;base64,${text}`;
    }
  }

  return null;
}

export async function generateImage(body) {
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
  } = body;

  const fullPrompt = buildFullPrompt({
    prompt,
    type,
    shotMode,
    productFocus,
    modelVariation,
  });

  const meta =
    clientSlotIndex !== undefined && clientSlotIndex !== null
      ? { clientSlotIndex, clientRunId }
      : {};

  try {
    let imageUrl = null;

    if (model === "openai" && process.env.OPENAI_API_KEY) {
      imageUrl = await generateWithOpenAI(fullPrompt);
    } else if (model === "replicate" && process.env.REPLICATE_API_TOKEN) {
      imageUrl = await generateWithReplicate(fullPrompt);
    } else if (model === "stability" && process.env.STABILITY_API_KEY) {
      imageUrl = await generateWithStability(fullPrompt);
    } else if (model === "gemini" && process.env.GEMINI_API_KEY) {
      imageUrl = await generateWithGemini({
        fullPrompt,
        shotMode,
        jewelleryImage,
        modelImage,
      });
    }

    if (imageUrl) {
      return { imageUrl, ...meta };
    }

    return {
      imageUrl:
        "https://placehold.co/400x500/222/f00?text=Model+Not+Configured+Or+Failed",
      ...meta,
    };
  } catch (err) {
    console.error("Error generating image:", err);
    return {
      imageUrl: "https://placehold.co/400x500/222/f00?text=Timeout+or+Error",
      ...meta,
    };
  }
}
