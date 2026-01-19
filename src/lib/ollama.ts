import { OLLAMA_CONFIG } from '@/config/ollama'

export interface GradientStop {
  color: string
  stop: number
}

/**
 * Calls Ollama API to generate a gradient based on a text prompt.
 * Returns an array of { color, stop } where stop is 0–100 (percentage along the gradient).
 */
export async function generateGradientFromPrompt(prompt: string): Promise<GradientStop[]> {
  const systemPrompt = `You are a gradient color generator. Create beautiful, well-balanced gradients based on user descriptions.

Rules:
- Generate 2-4 color stops
- Each stop: {"color": "#RRGGBB", "stop": 0-100}
- "stop" is the position: 0 = start, 100 = end
- First stop must be 0, last must be 100
- Middle stops create smooth transitions (e.g., 30, 60)
- Match the visual essence of the description (e.g., "night sky" = dark blues, not bright)
- For abstract concepts (e.g., "joy", "energy"), interpret the mood with appropriate colors
- Adjacent colors should blend naturally

Examples:
- "night sky" → [{"color":"#0a1128","stop":0},{"color":"#1e3a8a","stop":100}]
- "sunset" → [{"color":"#ff6b35","stop":0},{"color":"#f7931e","stop":40},{"color":"#feca57","stop":100}]
- "forest" → [{"color":"#1a4d2e","stop":0},{"color":"#4f7942","stop":100}]

Return ONLY valid JSON. No markdown, no explanation.
Format: [{"color":"#RRGGBB","stop":number}, ...]`

  try {
    // When useCloud: require API key unless our server adds it (Vercel: VITE_OLLAMA_USE_PROXY=true)
    if (OLLAMA_CONFIG.useCloud && !OLLAMA_CONFIG.apiKey && !OLLAMA_CONFIG.serverAddsAuth) {
      throw new Error(
        'API key is required for Ollama Cloud. Set VITE_OLLAMA_API_KEY in .env.local (or OLLAMA_API_KEY on the server and VITE_OLLAMA_USE_PROXY=true on Vercel).'
      )
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add Authorization header if API key is provided (required for cloud, optional for local)
    if (OLLAMA_CONFIG.apiKey) {
      headers['Authorization'] = `Bearer ${OLLAMA_CONFIG.apiKey}`
    }

    // Cloud: /api/ollama + /chat (unchanged)
    // Local: Ollama docs — POST http://localhost:11434/api/chat (no /api-local, no proxy path)
    const url = OLLAMA_CONFIG.useCloud
      ? `${OLLAMA_CONFIG.baseUrl}/chat`
      : 'http://localhost:11434/api/chat'

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: OLLAMA_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Generate a gradient for: ${prompt}`,
          },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errMsg = `Ollama API error (${response.status}): ${errorText || response.statusText}`
      try {
        const errJson = errorText ? JSON.parse(errorText) : null
        if (errJson?.error) errMsg = `Ollama: ${errJson.error}`
      } catch (_) {}
      throw new Error(errMsg)
    }

    const data = await response.json()
    console.log('Ollama response:', data)
    let content = data.message?.content || data.content || (typeof data === 'string' ? data : '')

    // Strip markdown code blocks if present (common with local models)
    const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlock) content = codeBlock[1].trim()

    // Extract JSON array: use greedy match so we get the full [...] (non-greedy can cut at the first ] inside)
    let jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      const trimmed = content.trim()
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) jsonMatch = [trimmed]
    }
    if (!jsonMatch) throw new Error('Could not find JSON array in Ollama response')

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      throw new Error('Could not parse JSON from Ollama response')
    }

    if (!Array.isArray(parsed) || parsed.length < 2) {
      throw new Error('Invalid response: Need at least 2 color stops')
    }

    // New format: [{"color":"#hex","stop":0},...]
    const isNewFormat = parsed.every(
      (x) => x && typeof x === 'object' && 'color' in x && 'stop' in x
    )

    if (isNewFormat) {
      const stops: GradientStop[] = (parsed as { color?: string; stop?: number }[])
        .map(({ color: c, stop: s }) => {
          let color = String(c ?? '').trim()
          if (!color.startsWith('#')) color = `#${color}`
          if (color.length === 4)
            color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
          const stop = Math.max(0, Math.min(100, Number(s) || 0))
          return { color: color.toUpperCase(), stop: Math.round(stop) }
        })
        .filter((x) => /^#[0-9A-F]{6}$/i.test(x.color))

      if (stops.length < 2) throw new Error('Invalid response: Need at least 2 valid color stops')
      const result = stops.sort((a, b) => a.stop - b.stop)
      console.log('Ollama gradient stops:', result)
      return result
    }

    // Legacy: plain hex array → even stops
    const hex = (parsed as string[]).filter((x) => typeof x === 'string')
    if (hex.length < 2) throw new Error('Invalid response: Need at least 2 colors')
    const hexColors = hex
      .map((c) => {
        let s = String(c).trim()
        if (!s.startsWith('#')) s = `#${s}`
        if (s.length === 4) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`
        return s.toUpperCase()
      })
      .filter((s) => /^#[0-9A-F]{6}$/i.test(s))
    if (hexColors.length < 2) throw new Error('Invalid response: Need at least 2 valid hex colors')
    const result = hexColors.map((color, i) => ({
      color,
      stop: Math.round((i / (hexColors.length - 1)) * 100),
    }))
    console.log('Ollama gradient stops (legacy):', result)
    return result
  } catch (error) {
    console.error('Error generating gradient from Ollama:', error)
    // Friendlier message when local Ollama can't be reached
    if (!OLLAMA_CONFIG.useCloud) {
      const msg = String(error instanceof Error ? error.message : error).toLowerCase()
      if (error instanceof TypeError || /failed to fetch|network|load failed|connection refused/i.test(msg)) {
        throw new Error(
          'Cannot reach Ollama. Is it running? Run `ollama serve` and pull a model (e.g. `ollama pull phi3`). If you use another model, set VITE_OLLAMA_MODEL in .env.local.'
        )
      }
      if (/model.*not found|not found.*model|404/i.test(msg)) {
        throw new Error(
          `Model "${OLLAMA_CONFIG.model}" not found. Run \`ollama pull ${OLLAMA_CONFIG.model}\` or set VITE_OLLAMA_MODEL in .env.local to a model you have (e.g. llama3.2:latest).`
        )
      }
    }
    throw error
  }
}
