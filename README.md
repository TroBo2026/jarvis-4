# JARVIS 5.0 – modular personal AI

JARVIS 5.0 is a static, iPad-friendly web application. It uses the existing Cloudflare Worker as a secure gateway to Workers AI.

## Architecture

- `index.html` – semantic application shell and navigation
- `styles.css` – single responsive design system (desktop sidebar, iPad/mobile bottom navigation)
- `app.js` – UI orchestration, chat state, settings and event wiring
- `core/llm-client.js` – isolated HTTP client for the existing `POST /chat` Worker endpoint
- `core/memory.js` – local memory store, relevance search, and migration from the previous JARVIS 4.x storage keys
- `modules/voice.js` – browser speech recognition and speech synthesis

No build step or paid JavaScript package is required. GitHub Pages can serve the files as static assets.

## LLM connection

The browser calls the configured Worker URL at `/chat` and sends a bounded conversation history plus relevant memory notes. The Worker owns the model selection, system prompt, input validation, rate limiting, and the Workers AI binding. No Cloudflare API token is stored in the browser.

The currently deployed Worker was inspected and uses `@cf/ibm-granite/granite-4.0-h-micro` through the `AI` binding. This is a real hosted language model, not a scripted reply generator. The model is not trained by this project.

## Local vs hosted features

Works without a model/API request:
- UI, navigation and dashboard
- adding, searching and deleting local memory notes
- storing chat history in this browser
- browser speech input/output where supported

Requires the existing Cloudflare Worker and its Workers AI allowance:
- generating AI responses
- using relevant memory notes as model context

If the free allowance is exhausted, the Worker should reject the request. JARVIS must not enable paid billing or silently switch to a paid provider.

## First iPad test

1. Open the GitHub Pages preview after the branch is reviewed and published.
2. Open **Einstellungen** and check the Worker URL.
3. Open **KI-Chat** and send: `Antworte bitte nur mit: JARVIS-Verbindung erfolgreich.`
4. Add a memory note under **Gedächtnis**, then ask a question that matches it.
5. Delete the note and confirm it no longer appears in the memory list.

The feature branch is not automatically deployed. Do not merge or deploy it until the chat, memory migration, and iPad layout have been tested.
