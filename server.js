import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createCoachResponse, getCoachModel, transcribeAudio } from "./coach-core.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const staticRoot = join(root, "public");

await loadLocalEnv();

const port = Number(process.env.PORT || 8123);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "POST" && url.pathname === "/api/coach") {
      await handleCoach(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/transcribe") {
      await handleTranscription(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/status") {
      sendJson(response, 200, {
        live: Boolean(process.env.OPENAI_API_KEY),
        model: Boolean(process.env.OPENAI_API_KEY) ? getCoachModel() : null,
        voiceTranscription: Boolean(process.env.OPENAI_API_KEY)
      });
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveStatic(url.pathname, response, request.method === "HEAD");
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(response, 500, { error: "Server error", detail: error.message });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Repair running at http://127.0.0.1:${port}/`);
  console.log(process.env.OPENAI_API_KEY ? `Live AI enabled with ${getCoachModel()}` : "No OPENAI_API_KEY found. Frontend will use fallback.");
});

async function handleCoach(request, response) {
  try {
    const body = await readJsonBody(request);
    const result = await createCoachResponse({
      situation: body.situation,
      history: body.history,
      mode: body.mode
    });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, error.status || 500, { error: error.message || "Coach request failed" });
  }
}

async function handleTranscription(request, response) {
  try {
    const body = await readJsonBody(request);
    const result = await transcribeAudio({
      audioBase64: body.audioBase64,
      mimeType: body.mimeType
    });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, error.status || 500, { error: error.message || "Transcription failed" });
  }
}

async function serveStatic(pathname, response, headOnly) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const cleanPath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(staticRoot, cleanPath);

  if (!filePath.startsWith(staticRoot) || cleanPath.split(/[/\\]/).some((part) => part.startsWith("."))) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    if (!headOnly) response.end(file);
    else response.end();
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function loadLocalEnv() {
  try {
    const envFile = await readFile(join(root, ".env"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional.
  }
}
