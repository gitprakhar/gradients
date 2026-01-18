// Ollama API configuration
// Create a .env.local file in the root directory with:
// VITE_OLLAMA_API_KEY=your_api_key_here (optional for local Ollama)
// VITE_OLLAMA_BASE_URL=http://localhost:11434 (or your Ollama URL)
// VITE_OLLAMA_MODEL=phi3 (or deepseek-r1:7b, or any model you have downloaded)

export const OLLAMA_CONFIG = {
  apiKey: import.meta.env.VITE_OLLAMA_API_KEY || '',
  baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
  model: import.meta.env.VITE_OLLAMA_MODEL || 'phi3', // Default to phi3, can be changed
}
