// Ollama API configuration
// - Local: copy .env.example to .env.local. For cloud: VITE_OLLAMA_USE_CLOUD=true, VITE_OLLAMA_API_KEY=...
//   For local Ollama: leave VITE_OLLAMA_USE_CLOUD unset, run Ollama. Vite proxies /api/ollama-local to avoid CORS.
// - Vercel: VITE_OLLAMA_USE_CLOUD=true, VITE_OLLAMA_USE_PROXY=true, OLLAMA_API_KEY=<key>, VITE_OLLAMA_MODEL (optional)

const useCloud = import.meta.env.VITE_OLLAMA_USE_CLOUD === 'true'
const serverAddsAuth = import.meta.env.VITE_OLLAMA_USE_PROXY === 'true'

export const OLLAMA_CONFIG = {
  useCloud,
  serverAddsAuth,
  apiKey: import.meta.env.VITE_OLLAMA_API_KEY || '',
  baseUrl:
    import.meta.env.VITE_OLLAMA_BASE_URL ||
    (useCloud ? '/api/ollama' : '/api/ollama-local'),
  model: import.meta.env.VITE_OLLAMA_MODEL || (useCloud ? 'gpt-oss:20b-cloud' : 'phi3:latest'),
}
