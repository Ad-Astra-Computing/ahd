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

// Model-family-specific generation knobs. Cloudflare Workers AI's
// /ai/v1/chat/completions endpoint forwards unknown top-level body
// fields to the underlying model; the OpenAI-compatible wrapper only
// normalises the standard OpenAI params, the rest passes through.
// That gives us reach into model-native switches without abandoning
// the OpenAI surface.
//
// Kimi k2.6 (Cloudflare release, 20 April 2026) defaults thinking=on
// and renames the suppression knob: OLD `enable_thinking: false`,
// NEW `chat_template_kwargs: { thinking: false }`. With our ~9KB
// swiss-editorial compiled system prompt, thinking eats the entire
// output-token budget on hidden reasoning and the endpoint returns
// 200 with `content: null`. The caller sees an empty body.
// Passing thinking: false restores normal content emission.
// Sources:
//   https://developers.cloudflare.com/changelog/post/2026-04-20-kimi-k2-6-workers-ai/
//   https://github.com/cloudflare/workers-sdk/issues/13239 (k2.5 precedent)
//
// Apply only to k2.6 and forward. k2.5 used the old `enable_thinking`
// key and isn't in the current roster, so leave it alone.
function extraBodyForModel(model: string): Record<string, unknown> | undefined {
  if (/^@cf\/moonshotai\/kimi-k2\.(6|[7-9]|\d{2,})/.test(model)) {
    return { chat_template_kwargs: { thinking: false } };
  }
  return undefined;
}

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
    extraBody: extraBodyForModel(options.model),
  });
  return {
    id: options.model,
    provider: "cloudflare-workers-ai",
    run: (input) => inner.run(input),
  };
}
