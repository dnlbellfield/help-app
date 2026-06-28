# Repair

A local-first attachment repair practice app with optional live OpenAI support.

## Run rule-based fallback only

Open `index.html` directly in a browser or serve the folder with any static server.

## Run live AI mode

Create a local `.env` file:

```bash
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4.1-mini
PORT=8123
```

Then run:

```bash
npm run start
```

Open `http://127.0.0.1:8123/`.

The browser sends situations to the local Node server at `/api/coach`. The API key stays server-side and is not exposed to the page.

## Deploy on Netlify

This app can deploy as a static site plus Netlify Functions.

1. Push the folder to a GitHub repo.
2. Create a new Netlify site from that repo.
3. Use these settings:
   - Build command: leave empty
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4. Add environment variables in Netlify:

```bash
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4.1-mini
```

The frontend still calls `/api/coach` and `/api/status`; `netlify.toml` rewrites those paths to Netlify Functions.
