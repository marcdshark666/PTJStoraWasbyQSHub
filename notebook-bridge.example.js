// Private NotebookLM bridge example.
//
// Run only on a trusted machine/server after `notebooklm login`.
// Do not commit NotebookLM cookies, Google tokens, or storage_state.json.
//
// Local test:
//   node notebook-bridge.example.js
//
// Frontend configuration:
//   window.PTJ_NOTEBOOK_ENDPOINT = "http://localhost:8787/api/notebook";

const http = require("node:http");
const { spawn } = require("node:child_process");

const PORT = Number(process.env.PORT || 8787);
const NOTEBOOK_ID = process.env.NOTEBOOK_ID || "4b4902ea-8e75-4093-a1fb-c8e92cf8fd1a";
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "*";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function askNotebook(question) {
  const prompt = [
    "Svara på svenska.",
    "Använd endast källorna i notebooken.",
    "Parafrasera svaret. Citera inte längre stycken ordagrant.",
    "Ange alltid vilken fil eller källa i notebooken svaret bygger på när det går.",
    "Om du inte hittar en exakt träff ska du leta efter närliggande eller snarlikt material i källorna.",
    "När svaret bara är snarlikt ska du säga det tydligt, parafrasera det närliggande materialet, ange fil/källa och fråga användaren om det var detta de sökte.",
    "Om källorna inte räcker alls, säg tydligt att underlaget saknas och ställ en kort följdfråga som hjälper användaren ringa in rätt rutin.",
    "",
    `Fråga: ${question}`
  ].join("\n");

  return new Promise((resolve, reject) => {
    const child = spawn("notebooklm", [
      "ask",
      prompt,
      "--notebook",
      NOTEBOOK_ID,
      "--json"
    ], {
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `notebooklm exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve({
          answer: parsed.answer || "",
          source: "NotebookLM"
        });
      } catch (error) {
        reject(new Error(`Could not parse notebooklm JSON: ${error.message}`));
      }
    });
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/notebook") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const body = await readBody(request);
    const payload = JSON.parse(body || "{}");
    const question = String(payload.question || "").trim();

    if (!question) {
      sendJson(response, 400, { error: "Question is required" });
      return;
    }

    const answer = await askNotebook(question);
    sendJson(response, 200, answer);
  } catch (error) {
    sendJson(response, 500, {
      error: "Notebook bridge failed",
      message: error.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`Notebook bridge listening on http://localhost:${PORT}/api/notebook`);
});
