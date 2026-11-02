import { proxyContentRequest } from "../_lib/content.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  return proxyContentRequest(req, res);
}
