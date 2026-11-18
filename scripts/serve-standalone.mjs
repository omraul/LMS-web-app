// Zero-dependency local HTTP server for the Dempo Vidya Standalone LMS Web App.
// Usage: node scripts/serve-standalone.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(__dirname, "..", "standalone-lms", "index.html");
const port = Number(process.env.PORT) || 4173;

const server = http.createServer((req, res) => {
  if (req.url === "/api/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", app: "Dempo Vidya LMS", region: "ap-south-1" }));
    return;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Dempo Vidya Standalone LMS running at http://localhost:${port}`);
});
