import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { openaiRunner } from "./openai.js";
import type { ModelRunner } from "./types.js";

const DEFAULT_ROUTER = "https://router.huggingface.co/v1";

// Canonical Hugging Face inference hosts. The token is forwarded to
// whatever the endpoint URL resolves to; limiting to this set
// prevents a stray HF_INFERENCE_ENDPOINT from silently routing the
// token to a non-HF host. AHD_HF_UNSAFE_ENDPOINT=1 opts out for
// self-hosted inference endpoints — caller accepts the risk.
const HF_ALLOWED_HOSTS = new Set([
  "router.huggingface.co",
  "api-inference.huggingface.co",
  "huggingface.co",
]);
const HF_ALLOWED_HOST_SUFFIXES = [
  ".endpoints.huggingface.cloud", // managed inference endpoints
];

function validateHfEndpoint(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Hugging Face endpoint is not a valid URL: ${raw}`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(
      `Hugging Face endpoint must use https (token goes through it). Got: ${raw}`,
    );
  }
  const host = parsed.hostname.toLowerCase();
  const allowed =
    HF_ALLOWED_HOSTS.has(host) ||
    HF_ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s));
  if (!allowed && process.env.AHD_HF_UNSAFE_ENDPOINT !== "1") {
    throw new Error(
      `Hugging Face endpoint host ${host} is not in the allow-list ` +
        `(router.huggingface.co, api-inference.huggingface.co, ` +
        `huggingface.co, *.endpoints.huggingface.cloud). ` +
        `Set AHD_HF_UNSAFE_ENDPOINT=1 if you explicitly want to route ` +
        `HF_TOKEN through a custom inference endpoint.`,
    );
  }
  return raw.replace(/\/+$/, "");
}

async function resolveHfToken(): Promise<string | undefined> {
  if (process.env.HF_TOKEN) return process.env.HF_TOKEN;
  if (process.env.HUGGINGFACE_API_TOKEN) return process.env.HUGGINGFACE_API_TOKEN;
  if (process.env.HUGGING_FACE_HUB_TOKEN) return process.env.HUGGING_FACE_HUB_TOKEN;
  const cached = resolve(homedir(), ".cache", "huggingface", "token");
  if (existsSync(cached)) {
    try {
      return (await readFile(cached, "utf8")).trim();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function huggingfaceRunner(options: {
  token?: string;
  model: string;
  baseURL?: string;
}): Promise<ModelRunner> {
  const token = options.token ?? (await resolveHfToken());
  if (!token) {
    throw new Error(
      "Hugging Face token not found. Set HF_TOKEN, HUGGINGFACE_API_TOKEN, or log in with `huggingface-cli login`.",
    );
  }
  const rawBaseURL =
    options.baseURL ??
    process.env.HF_INFERENCE_ENDPOINT ??
    DEFAULT_ROUTER;
  const baseURL = validateHfEndpoint(rawBaseURL);
  const inner = openaiRunner({
    apiKey: token,
    model: options.model,
    baseURL,
  });
  return {
    id: options.model,
    provider: "huggingface",
    run: (input) => inner.run(input),
  };
}
