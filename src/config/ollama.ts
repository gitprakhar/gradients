// Ollama API configuration
// Create a .env.local file in the root directory with:
// VITE_OLLAMA_USE_CLOUD=true (set to true for cloud, false or omit for local)
// VITE_OLLAMA_API_KEY=your_api_key_here (required for cloud, optional for local)
// VITE_OLLAMA_BASE_URL (auto-set: cloud=/api/ollama for Vite proxy, local=http://localhost:11434; override only if you have your own backend)
// VITE_OLLAMA_MODEL=gpt-oss:20b-cloud (cloud model) or deepseek-r1:7b (local model)

const useCloud = import.meta.env.VITE_OLLAMA_USE_CLOUD === 'false'

export const OLLAMA_CONFIG = {
  useCloud,
  apiKey: import.meta.env.VITE_OLLAMA_API_KEY || '',
  baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || (useCloud ? '/api/ollama' : 'http://localhost:11434'),
  model: import.meta.env.VITE_OLLAMA_MODEL || (useCloud ? 'gpt-oss:20b-cloud' : 'phi3:latest'),
}
