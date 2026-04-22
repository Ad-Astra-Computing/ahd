import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { openaiRunner } from "./openai.js";
import type { ModelRunner } from "./types.js";

const DEFAULT_ROUTER = "https://router.huggingface.co/v1";

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
  const baseURL =
    options.baseURL ??
    process.env.HF_INFERENCE_ENDPOINT ??
    DEFAULT_ROUTER;
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
