import { OLLAMA_CONFIG } from '@/config/ollama'

export interface GradientColors {
  colors: string[] // Array of hex color codes
}

/**
 * Calls Ollama API to generate a gradient based on a text prompt
 * Returns an array of hex color codes for the gradient
 */
export async function generateGradientFromPrompt(prompt: string): Promise<string[]> {
  // Note: Local Ollama doesn't require an API key - it's optional for hosted instances
  const systemPrompt = `You are a gradient color generator that creates realistic, visually accurate gradients.

Important rules:
- Generate 2-4 hex colors that blend smoothly together
- Use colors that match the ACTUAL visual appearance (e.g., "night sky" should be very dark blues/purples, not bright blue)
- Consider real-world lighting and color temperature
- Adjacent colors should be similar enough to blend smoothly

Examples of good color accuracy:
- "night sky" → ["#0a1128", "#1e3a8a"] (very dark blues)
- "sunset" → ["#ff6b35", "#f7931e", "#feca57"] (warm oranges/yellows)
- "forest" → ["#1a4d2e", "#4f7942"] (deep greens)
- "ocean depth" → ["#001f3f", "#0074d9"] (dark to medium blue)

Return ONLY a JSON array: ["#color1", "#color2", "#color3"]
No explanation, markdown, or other text.`

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

    let colorsArray: string[]
    try {
      colorsArray = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      // Try to extract hex codes manually if JSON parsing fails
      const hexMatches = content.match(/#[0-9A-F]{6}/gi)
      if (hexMatches && hexMatches.length >= 2) {
        colorsArray = hexMatches
      } else {
        throw new Error('Could not parse color array from Ollama response')
      }
    }
    
    // Validate and format colors
    const hexColors = colorsArray
      .map((color: string) => {
        // Ensure hex format
        let cleanColor = color.trim().toUpperCase()
        if (!cleanColor.startsWith('#')) {
          cleanColor = `#${cleanColor.replace(/^#/, '')}`
        }
        // Ensure 6-digit hex
        if (cleanColor.length === 4) {
          // Convert #RGB to #RRGGBB
          cleanColor = `#${cleanColor[1]}${cleanColor[1]}${cleanColor[2]}${cleanColor[2]}${cleanColor[3]}${cleanColor[3]}`
        }
        return cleanColor
      })
      .filter((color: string) => /^#[0-9A-F]{6}$/i.test(color))

    if (hexColors.length < 2) {
      throw new Error('Invalid response: Need at least 2 colors for a gradient')
    }

    return hexColors
  } catch (error) {
    console.error('Error generating gradient from Ollama:', error)
    throw error
  }
}
