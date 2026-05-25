export function getAvailableModels() {
  const models = [];
  if (process.env.GEMINI_API_KEY) models.push("gemini");
  if (process.env.OPENAI_API_KEY) models.push("openai");
  if (process.env.REPLICATE_API_TOKEN) models.push("replicate");
  if (process.env.STABILITY_API_KEY) models.push("stability");
  return { models };
}
