import { anthropicRunner } from "./anthropic.js";
import { openaiRunner } from "./openai.js";
import { geminiRunner } from "./gemini.js";
import { ollamaRunner } from "./ollama.js";
import { mockRunner, slopResponder, swissResponder } from "./mock.js";
import type { ModelRunner } from "./types.js";

export function runnerFromSpec(spec: string): ModelRunner {
  if (spec === "mock-slop") return mockRunner("mock-slop", slopResponder);
  if (spec === "mock-swiss") return mockRunner("mock-swiss", swissResponder);
  if (spec.startsWith("claude")) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    return anthropicRunner({ apiKey: key, model: spec });
  }
  if (spec.startsWith("gpt") || spec.startsWith("o")) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    return openaiRunner({ apiKey: key, model: spec });
  }
  if (spec.startsWith("gemini")) {
    const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    return geminiRunner({ apiKey: key, model: spec });
  }
  if (spec.startsWith("ollama:")) {
    const model = spec.slice("ollama:".length);
    return ollamaRunner({ model });
  }
  throw new Error(
    `Unknown model spec: ${spec}. Prefix with 'claude', 'gpt', 'gemini', 'ollama:' or use 'mock-slop' / 'mock-swiss'.`,
  );
}

export { anthropicRunner, openaiRunner, geminiRunner, ollamaRunner, mockRunner, slopResponder, swissResponder };
export type { ModelRunner } from "./types.js";
