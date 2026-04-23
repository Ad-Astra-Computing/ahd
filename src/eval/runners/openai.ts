import type {
  ModelRunner,
  ModelRunnerInput,
  ModelRunnerOutput,
} from "./types.js";
import { extractHtmlBlock } from "./types.js";

export function openaiRunner(options: {
  apiKey: string;
  model?: string;
  baseURL?: string;
  /**
   * Vendor-specific body fields spread into the chat/completions
   * payload. Used to send model-family-specific knobs that aren't
   * in the OpenAI schema (e.g. Cloudflare Workers AI's
   * `chat_template_kwargs: { thinking: false }` for Kimi k2.6 to
   * prevent reasoning-mode from eating the entire output budget).
   * The OpenAI-compatible endpoint on CF forwards unknown top-level
   * fields to the underlying model as extra generation params.
   */
  extraBody?: Record<string, unknown>;
}): ModelRunner {
  const model = options.model ?? "gpt-5";
  const baseURL = options.baseURL ?? "https://api.openai.com/v1";
  return {
    id: model,
    provider: "openai",
    async run(input: ModelRunnerInput): Promise<ModelRunnerOutput> {
      const start = Date.now();
      const messages: any[] = [];
      if (input.systemPrompt)
        messages.push({ role: "system", content: input.systemPrompt });
      messages.push({ role: "user", content: input.userPrompt });
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_completion_tokens: input.maxTokens ?? 4096,
          seed: input.seed,
          ...(options.extraBody ?? {}),
        }),
      });
      if (!res.ok) {
        throw new Error(`openai ${model}: ${res.status} ${await res.text()}`);
      }
      const data: any = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      return {
        model,
        html: extractHtmlBlock(text),
        rawResponse: text,
        tokens: {
          in: data.usage?.prompt_tokens ?? 0,
          out: data.usage?.completion_tokens ?? 0,
        },
        latencyMs: Date.now() - start,
      };
    },
  };
}
