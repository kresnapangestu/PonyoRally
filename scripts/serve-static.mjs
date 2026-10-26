// Serves the static export the way a static host would: /new -> new.html,
// unknown paths -> 404.html. Used by the end-to-end tests and for a quick
// local preview of a production build:  node scripts/serve-static.mjs out 4173
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  for (const candidate of [path, `${path}.html`, join(path, "index.html")]) {
    const file = join(root, candidate);
    if (file.startsWith(root) && (await isFile(file))) {
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(await readFile(file));
      return;
    }
  }
  res.writeHead(404, { "content-type": TYPES[".html"] });
  res.end(await readFile(join(root, "404.html")));
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));
