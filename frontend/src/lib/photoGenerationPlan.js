/**
 * Fixed pack: 3 model editorial shots + 2 product packshots.
 * (One provider call was failing; keep it to 5 total.)
 */

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

export function buildGenerationJobs(jewelleryType) {
  const productFocuses = getProductFocuses(jewelleryType);
  const jobs = [];

  for (let i = 0; i < 3; i++) {
    jobs.push({
      shotMode: 'model',
      label: `Model · ${i + 1}`,
      modelVariation: MODEL_VARIATIONS[i],
      productFocus: null,
    });
  }
  const productLabels =
    jewelleryType === 'necklace_set'
      ? ['Product · Necklace', 'Product · Earrings (pair)']
      : ['Product · 1', 'Product · 2'];

  for (let i = 0; i < 2; i++) {
    jobs.push({
      shotMode: 'product',
      label: productLabels[i],
      modelVariation: null,
      productFocus: productFocuses[i],
    });
  }

  return jobs;
}
