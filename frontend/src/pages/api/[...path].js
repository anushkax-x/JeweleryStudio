/**
 * Proxy /api/* to the Fastify backend with a long timeout.
 * Next.js rewrites time out on slow Gemini image generation (socket hang up).
 *
 * Production (Vercel): set BACKEND_URL to your Render service URL, e.g.
 *   https://your-app.onrender.com
 */
function getBackendBase() {
  const raw = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL)?.trim();
  if (raw) {
    return raw.replace(/\/+$/, '');
  }
  if (process.env.VERCEL) {
    return null;
  }
  return 'http://127.0.0.1:3011';
}

const PROXY_TIMEOUT_MS = 5 * 60 * 1000;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req, res) {
  const backend = getBackendBase();
  if (!backend) {
    console.error('[api proxy] BACKEND_URL is not set on Vercel');
    return res.status(502).json({
      error: 'Backend not configured',
      detail:
        'Set BACKEND_URL in Vercel project settings to your Render URL (e.g. https://your-app.onrender.com), then redeploy.',
    });
  }

  const segments = req.query.path;
  const path = Array.isArray(segments) ? segments.join('/') : segments || '';
  const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const url = `${backend}/${path}${qs}`;

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
      },
      body:
        req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });

    const body = await upstream.text();
    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }
    res.send(body);
  } catch (error) {
    console.error('[api proxy]', path, '→', backend, error.message);
    res.status(502).json({
      error: 'Backend request failed',
      detail: error.message,
      hint:
        'Check BACKEND_URL on Vercel points to your live Render URL. Free Render services sleep until the first request (can take ~30s).',
    });
  }
}
