import { serveContentRequest } from "./_lib/content.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const path = req.query?.path ?? new URL(req.url ?? "/", "http://localhost").searchParams.get("path");
  return serveContentRequest(req, res, path);
}
