export const MODEL_VARIATIONS = [
  'Straight-on: frame from just under the chin through upper chest; necklace and earrings visible; face above chin must be cropped out entirely.',
  'Three-quarter: neck and one ear in profile; chin tip may appear at top edge but no eyes or nose; macro detail on stones and metal.',
  'Low angle from collarbone up: jawline may touch top edge but no mouth or eyes visible; emphasis on necklace sitting on skin.',
];

export function getProductFocuses(jewelleryType) {
  const t = jewelleryType || '';
  if (t === 'necklace_set') {
    return [
      'Necklace only on white: top-down or slight angle; full necklace visible; no model, no skin.',
      'Matching earrings only on white: pair laid symmetrically; no face, no wearing shot.',
    ];
  }
  if (t === 'necklace') {
    return [
      'Necklace hero: full length visible, slight top-down angle.',
      'Necklace alternate angle: clasp area and chain detail.',
    ];
  }
  if (t === 'earrings') {
    return [
      'Earrings as a pair, symmetric flat lay on white.',
      'Single earring macro front view.',
    ];
  }
  if (t === 'ring') {
    return [
      'Ring top-down on white, stone centered.',
      'Ring three-quarter angle showing band profile.',
    ];
  }
  if (t === 'bracelet') {
    return [
      'Bracelet in soft circle layout, full piece visible.',
      'Bracelet partial arc highlighting clasp or focal gem.',
    ];
  }
  return [
    'Primary product angle: full piece, centered.',
    'Secondary angle: detail of craftsmanship.',
  ];
}

function productLabel(jewelleryType, index) {
  if (jewelleryType === 'necklace_set') {
    return index === 0 ? 'Product · Necklace' : 'Product · Earrings (pair)';
  }
  return `Product · ${index + 1}`;
}

/**
 * @param {string} jewelleryType
 * @param {{ modelCount?: number, productCount?: number }} counts from Prompt lab
 */
export function buildGenerationJobs(jewelleryType, { modelCount = 0, productCount = 0 } = {}) {
  const modelN = Math.max(0, Math.floor(modelCount));
  const productN = Math.max(0, Math.floor(productCount));
  const productFocuses = getProductFocuses(jewelleryType);
  const jobs = [];

  for (let i = 0; i < modelN; i += 1) {
    jobs.push({
      shotMode: 'model',
      label: `Model · ${i + 1}`,
      modelVariation: MODEL_VARIATIONS[i % MODEL_VARIATIONS.length],
      productFocus: null,
    });
  }

  for (let i = 0; i < productN; i += 1) {
    jobs.push({
      shotMode: 'product',
      label: productLabel(jewelleryType, i),
      modelVariation: null,
      productFocus: productFocuses[i % productFocuses.length],
    });
  }

  return jobs;
}
