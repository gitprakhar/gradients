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
  const systemPrompt = `You are a gradient color generator. Given a text prompt, generate a beautiful linear gradient by providing hex color codes.
  
Return ONLY a JSON array of hex color codes (e.g., ["#FF0000", "#00FF00", "#0000FF"]). 
Use as many colors as needed to create the perfect gradient for the given prompt.
Do not include any explanation, markdown, or other text - just the JSON array.`

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add Authorization header only if API key is provided (optional for local Ollama)
    if (OLLAMA_CONFIG.apiKey) {
      headers['Authorization'] = `Bearer ${OLLAMA_CONFIG.apiKey}`
    }

    console.log('Calling Ollama at:', `${OLLAMA_CONFIG.baseUrl}/api/chat`)

    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/chat`, {
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
      throw new Error(`Ollama API error (${response.status}): ${errorText || response.statusText}`)
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
