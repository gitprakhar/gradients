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
    // Require API key when using cloud
    if (OLLAMA_CONFIG.useCloud && !OLLAMA_CONFIG.apiKey) {
      throw new Error('API key is required when using Ollama Cloud. Please set VITE_OLLAMA_API_KEY in .env.local')
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add Authorization header if API key is provided (required for cloud, optional for local)
    if (OLLAMA_CONFIG.apiKey) {
      headers['Authorization'] = `Bearer ${OLLAMA_CONFIG.apiKey}`
    }

    const chatPath = OLLAMA_CONFIG.useCloud ? '/chat' : '/api/chat'
    const url = `${OLLAMA_CONFIG.baseUrl}${chatPath}`

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
    // Handle different response structures from Ollama
    const content = data.message?.content || data.content || (typeof data === 'string' ? data : '')
    
    // Parse the JSON array from the response
    // Try to extract JSON array from the response (handles multiline and escaped quotes)
    let jsonMatch = content.match(/\[[\s\S]*?\]/)
    if (!jsonMatch) {
      // If no array found, try to parse the whole content
      const trimmed = content.trim()
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        jsonMatch = [trimmed]
      } else {
        throw new Error('Could not find JSON array in Ollama response')
      }
    }

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
      return stops.sort((a, b) => a.stop - b.stop)
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
    return hexColors.map((color, i) => ({
      color,
      stop: Math.round((i / (hexColors.length - 1)) * 100),
    }))
  } catch (error) {
    console.error('Error generating gradient from Ollama:', error)
    throw error
  }
}
