# Vibe Gradients Figma Plugin (Dev)

## Setup
1) Set your API endpoint in `plugin/ui.html`:
   - `API_URL` should point to your serverless proxy (e.g. https://YOUR_DOMAIN_HERE/api/ollama/chat)
2) Update `plugin/manifest.json`:
   - Replace `https://YOUR_DOMAIN_HERE` with your domain in `networkAccess.allowedDomains`.

## Load in Figma
1) Open Figma → `Plugins` → `Development` → `Import plugin from manifest...`
2) Select `plugin/manifest.json`
3) Run the plugin

## Use
- Type a vibe, click Generate, then Apply
- If nothing is selected, the plugin creates a 512×512 rectangle
- If nodes are selected, it applies the gradient to any node that supports fills

## Notes
- This is a minimal v1. No bundler required.
- If you want to reuse your existing prompts or UI, we can add a build step later.
