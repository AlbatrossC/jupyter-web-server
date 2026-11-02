import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";
import { contentTarget } from "../api/_lib/content.js";

const root = process.cwd();
const port = Number(process.env.PORT ?? 8000);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };
const appRoutes = /^\/(tree|notebooks|edit)(\/|$)/;

createServer(async (request, response) => {
  const requestUrl = new URL(request.url, "http://localhost");
  const pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/api/content" || pathname.startsWith("/api/content/")) {
    try {
      const path = pathname === "/api/content"
        ? requestUrl.searchParams.get("path")
        : pathname.slice("/api/content/".length).split("/");
      const upstream = await fetch(contentTarget(path, request.headers.host), {
        method: request.method,
        headers: request.headers.range ? { Range: request.headers.range } : {},
      });
      const headers = { "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream", "Cache-Control": "no-store" };
      // fetch() may decode a compressed upstream response, so its original
      // Content-Length would no longer describe the bytes sent to the client.
      for (const name of ["content-range", "accept-ranges"]) {
        const value = upstream.headers.get(name);
        if (value) headers[name] = value;
      }
      response.writeHead(upstream.status, headers);
      if (request.method === "HEAD" || !upstream.body) response.end();
      else Readable.fromWeb(upstream.body).pipe(response);
    } catch (error) {
      response.writeHead(error.message === "Invalid content path" ? 400 : 502).end(error.message);
    }
    return;
  }
  const file = pathname === "/" || appRoutes.test(pathname) ? "index.html" : normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, file);
  let size;
  try { size = statSync(filePath).size; } catch { response.writeHead(404).end("Not found"); return; }
  response.writeHead(200, { "Content-Type": types[extname(filePath)] ?? "application/octet-stream", "Content-Length": size, "Accept-Ranges": "bytes" });
  createReadStream(filePath).pipe(response);
}).listen(port, () => console.log(`Jupyter web server listening at http://localhost:${port}/tree`));
