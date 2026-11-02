import { Readable } from "node:stream";
import sourceMap from "../../content-sources.json" with { type: "json" };

function safeSegments(value) {
  const segments = Array.isArray(value) ? value : String(value ?? "").split("/");
  if (!segments.length || segments.some((part) => !part || part === "." || part === ".." || part.includes("\\") || part.includes("\0"))) {
    throw new Error("Invalid content path");
  }
  return segments;
}

function safeBranch(branch) {
  const segments = String(branch ?? "main").split("/");
  if (!segments.length || segments.some((part) => !part || part === "." || part === "..")) throw new Error("Invalid content branch");
  return segments.map(encodeURIComponent).join("/");
}

export function contentTarget(path, host = "") {
  const hostname = String(host).split(":")[0].toLowerCase();
  const source = sourceMap.hosts[hostname] ?? sourceMap.default;
  if (!source || !/^[\w.-]+$/.test(source.owner) || !/^[\w.-]+$/.test(source.repo)) throw new Error("Content source is not configured");
  const root = safeSegments(source.root);
  const file = safeSegments(path);
  const encodedPath = [...root, ...file].map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/${safeBranch(source.branch)}/${encodedPath}`;
}

export async function proxyContentRequest(req, res, path = req.query?.path) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).end("Method not allowed");
    return;
  }
  const controller = new AbortController();
  res.on("close", () => controller.abort());
  try {
    const target = contentTarget(path, req.headers.host);
    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;
    const upstream = await fetch(target, { method: req.method, headers, signal: controller.signal });
    res.statusCode = upstream.status;
    // fetch() transparently decompresses upstream responses. Forwarding the
    // upstream Content-Length can then truncate the streamed, decoded body.
    for (const header of ["content-type", "content-range", "accept-ranges", "etag", "last-modified"]) {
      const value = upstream.headers.get(header);
      if (value) res.setHeader(header, value);
    }
    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "HEAD" || !upstream.body) { res.end(); return; }
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    if (res.headersSent || res.destroyed) return;
    res.statusCode = error.message === "Invalid content path" ? 400 : 502;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(error.message === "Invalid content path" ? "Invalid content path" : "Content source unavailable");
  }
}
