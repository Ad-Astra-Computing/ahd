import { openaiRunner } from "./openai.js";
import type { ModelRunner } from "./types.js";

export const WORKERS_AI_DEFAULTS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
  "@cf/qwen/qwq-32b",
  "@cf/qwen/qwen2.5-coder-32b-instruct",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "@cf/google/gemma-3-12b-it",
] as const;

export function workersAiRunner(options: {
  apiToken: string;
  accountId: string;
  model: string;
}): ModelRunner {
  const baseURL = `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/ai/v1`;
  const inner = openaiRunner({
    apiKey: options.apiToken,
    model: options.model,
    baseURL,
  });
  return {
    id: options.model,
    provider: "cloudflare-workers-ai",
    run: (input) => inner.run(input),
  };
}
