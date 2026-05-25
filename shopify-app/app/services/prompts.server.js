import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_PATH = path.join(__dirname, "../../data/prompts.json");

export function loadPrompts() {
  const raw = fs.readFileSync(PROMPTS_PATH, "utf8");
  const arr = JSON.parse(raw);
  return arr.map((p) => ({
    ...p,
    id: String(p.id),
  }));
}

export function savePrompts(prompts) {
  fs.writeFileSync(PROMPTS_PATH, JSON.stringify(prompts, null, 2), "utf8");
}

export function upsertPrompt({ prompt, title, id }) {
  const prompts = loadPrompts();
  const promptId = id != null && id !== "" ? String(id) : String(Date.now());
  const idx = prompts.findIndex((p) => String(p.id) === promptId);
  const promptData = {
    id: promptId,
    prompt,
    title: title || "Untitled",
  };
  if (idx >= 0) {
    prompts[idx] = { ...prompts[idx], ...promptData };
  } else {
    prompts.push(promptData);
  }
  savePrompts(prompts);
  return { success: true };
}

export function deletePrompt(id) {
  const filtered = loadPrompts().filter((p) => String(p.id) !== String(id));
  savePrompts(filtered);
  return { success: true };
}
