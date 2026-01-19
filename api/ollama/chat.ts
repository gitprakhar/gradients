import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Proxies POST /api/ollama/chat to Ollama Cloud (https://ollama.com/api/chat).
 * Adds OLLAMA_API_KEY server-side so it is not exposed to the client.
 *
 * On Vercel, set: OLLAMA_API_KEY, VITE_OLLAMA_USE_CLOUD=true, VITE_OLLAMA_USE_PROXY=true, VITE_OLLAMA_MODEL (optional)
 * Do not set VITE_OLLAMA_API_KEY when using this proxy.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OLLAMA_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'OLLAMA_API_KEY is not set. Add it in Vercel Project Settings → Environment Variables.',
    })
  }

  const url = 'https://ollama.com/api/chat'

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body ?? {}),
    })

    const data = await response.json().catch(() => ({}))
    res.status(response.status).json(data)
  } catch (err) {
    console.error('Ollama proxy error:', err)
    res.status(502).json({ error: 'Failed to reach Ollama Cloud' })
  }
}
