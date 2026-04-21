import { anthropicRunner } from "./anthropic.js";
import { openaiRunner } from "./openai.js";
import { geminiRunner } from "./gemini.js";
import { ollamaRunner } from "./ollama.js";
import { workersAiRunner } from "./workers-ai.js";
import { mockRunner, slopResponder, swissResponder } from "./mock.js";
import { cfGatewayUrl } from "./gateway.js";
import type { ModelRunner } from "./types.js";

export function runnerFromSpec(spec: string): ModelRunner {
  if (spec === "mock-slop") return mockRunner("mock-slop", slopResponder);
  if (spec === "mock-swiss") return mockRunner("mock-swiss", swissResponder);
  if (spec.startsWith("claude")) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    return anthropicRunner({
      apiKey: key,
      model: spec,
      baseURL: cfGatewayUrl("anthropic"),
    });
  }
  if (spec.startsWith("gpt") || spec.startsWith("o")) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    return openaiRunner({
      apiKey: key,
      model: spec,
      baseURL: cfGatewayUrl("openai"),
    });
  }
  if (spec.startsWith("gemini")) {
    const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    return geminiRunner({
      apiKey: key,
      model: spec,
      baseURL: cfGatewayUrl("google-ai-studio"),
    });
  }
  if (spec.startsWith("ollama:")) {
    const model = spec.slice("ollama:".length);
    return ollamaRunner({ model });
  }
  if (spec.startsWith("cf:")) {
    const model = spec.slice("cf:".length);
    const token = process.env.CF_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
    const account =
      process.env.CF_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!token) throw new Error("CF_API_TOKEN is not set");
    if (!account) throw new Error("CF_ACCOUNT_ID is not set");
    return workersAiRunner({ apiToken: token, accountId: account, model });
  }
  throw new Error(
    `Unknown model spec: ${spec}. Prefix with 'claude', 'gpt', 'gemini', 'cf:', 'ollama:' or use 'mock-slop' / 'mock-swiss'.`,
  );
}

export {
  anthropicRunner,
  openaiRunner,
  geminiRunner,
  ollamaRunner,
  workersAiRunner,
  mockRunner,
  slopResponder,
  swissResponder,
};
export { cfGatewayUrl } from "./gateway.js";
export type { ModelRunner } from "./types.js";
