import { createReadStream, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";

const contentRoot = resolve(process.cwd(), "content");
const contentTypes = {
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".py": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function resolveContentPath(value) {
  const segments = Array.isArray(value) ? value : String(value ?? "").split("/");
  if (!segments.length || segments.some((part) => !part || part === "." || part === ".." || part.includes("\\") || part.includes("\0"))) {
    throw new Error("Invalid content path");
  }
  const path = resolve(contentRoot, ...segments);
  if (path !== contentRoot && !path.startsWith(`${contentRoot}${sep}`)) throw new Error("Invalid content path");
  return path;
}

function listContentFiles(directory = contentRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "__pycache__") return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listContentFiles(path);
    if (!entry.isFile()) return [];
    const file = statSync(path);
    return [{ path: relative(contentRoot, path).split(sep).join("/"), modified: file.mtime.toISOString(), size: file.size }];
  }).sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }));
}

export async function serveContentRequest(req, res, requestedPath = req.query?.path) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }
  try {
    const path = resolveContentPath(requestedPath);
    if (path === join(contentRoot, "manifest.json")) {
      const body = JSON.stringify(listContentFiles());
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      if (req.method === "HEAD") res.end();
      else res.end(body);
      return;
    }
    const file = statSync(path);
    if (!file.isFile()) throw new Error("Invalid content path");
    res.statusCode = 200;
    res.setHeader("Content-Type", contentTypes[extname(path).toLowerCase()] ?? "application/octet-stream");
    res.setHeader("Content-Length", file.size);
    res.setHeader("Cache-Control", "public, max-age=120");
    if (req.method === "HEAD") res.end();
    else createReadStream(path).pipe(res);
  } catch (error) {
    if (res.headersSent || res.destroyed) return;
    res.statusCode = error.message === "Invalid content path" ? 400 : 404;
    res.end(error.message === "Invalid content path" ? "Invalid content path" : "Content not found");
  }
}
