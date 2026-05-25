import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { generateImage } from "../services/imageGeneration.server";

/** ~50 MB — matches legacy Fastify bodyLimit for base64 image uploads */
const MAX_BODY_BYTES = 52_428_800;

async function readJsonBody(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    throw new Error("Request body too large");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new Error("Request body too large");
  }
  return JSON.parse(text);
}

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    const body = await readJsonBody(request);
    const result = await generateImage(body);
    return json(result);
  } catch (error) {
    console.error("generate-image error:", error);
    return json(
      {
        imageUrl:
          "https://placehold.co/400x500/222/f00?text=Timeout+or+Error",
      },
      { status: 500 },
    );
  }
};
