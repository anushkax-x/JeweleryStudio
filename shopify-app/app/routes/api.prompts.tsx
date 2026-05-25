import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { loadPrompts, upsertPrompt } from "../services/prompts.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  try {
    return json(loadPrompts());
  } catch (error) {
    console.error(error);
    return json({ error: "Error fetching prompts" }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    const { prompt, title, id } = await request.json();
    const result = upsertPrompt({ prompt, title, id });
    return json(result);
  } catch (error) {
    console.error(error);
    return json({ error: "Error saving prompt" }, { status: 500 });
  }
};
