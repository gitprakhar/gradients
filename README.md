# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Deploying to Vercel (gradient AI)

For the **generate gradient** feature to work in production:

1. In [Vercel Project Settings → Environment Variables](https://vercel.com/docs/projects/environment-variables), add:
   - **`VITE_OLLAMA_USE_CLOUD`** = `true`
   - **`VITE_OLLAMA_USE_PROXY`** = `true` (use the serverless proxy that adds the API key; client does not send it)
   - **`OLLAMA_API_KEY`** = your [Ollama Cloud](https://ollama.com) API key (server-only; never use a `VITE_` prefix for this)
   - **`VITE_OLLAMA_MODEL`** = `gpt-oss:20b-cloud` (optional; this is the default for cloud)

2. Do **not** set `VITE_OLLAMA_API_KEY` on Vercel. The `api/ollama/chat` serverless function adds the key on the server.

3. Redeploy after changing env vars.

**Local development:**

- **Local Ollama:** Run `ollama serve` and pull a model (e.g. `ollama pull phi3`). Leave `VITE_OLLAMA_USE_CLOUD` unset. Vite proxies `/api/ollama-local` to `http://localhost:11434` to avoid CORS.
- **Ollama Cloud (local):** In `.env.local` set `VITE_OLLAMA_USE_CLOUD=true` and `VITE_OLLAMA_API_KEY=your_key`. Do **not** set `VITE_OLLAMA_USE_PROXY`; that is only for Vercel.

See `.env.example` for all options.
