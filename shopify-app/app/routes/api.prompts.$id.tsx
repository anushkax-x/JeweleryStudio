import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { deletePrompt } from "../services/prompts.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  if (request.method !== "DELETE") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    const result = deletePrompt(params.id);
    return json(result);
  } catch (error) {
    console.error(error);
    return json({ error: "Error deleting prompt" }, { status: 500 });
  }
};
