import { proxyContentRequest } from "../_lib/content.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const routePath = req.query?.path ?? String(req.url ?? "").split("?", 1)[0];
  const path = Array.isArray(routePath)
    ? routePath
    : routePath.startsWith("/api/content/")
      ? routePath.slice("/api/content/".length).split("/").map(decodeURIComponent)
      : routePath;
  return proxyContentRequest(req, res, path);
}
