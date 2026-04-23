import type {
  ModelRunner,
  ModelRunnerInput,
  ModelRunnerOutput,
} from "./types.js";
import { extractHtmlBlock } from "./types.js";

export function anthropicRunner(options: {
  apiKey: string;
  model?: string;
  baseURL?: string;
}): ModelRunner {
  const model = options.model ?? "claude-opus-4-7";
  const baseURL = (options.baseURL ?? "https://api.anthropic.com").replace(
    /\/+$/,
    "",
  );
  return {
    id: model,
    provider: "anthropic",
    async run(input: ModelRunnerInput): Promise<ModelRunnerOutput> {
      const start = Date.now();
      const res = await fetch(`${baseURL}/v1/messages`, {
        method: "POST",
        headers: {
          "x-api-key": options.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: input.maxTokens ?? 4096,
          system: input.systemPrompt,
          messages: [{ role: "user", content: input.userPrompt }],
        }),
      });
      if (!res.ok) {
        throw new Error(`anthropic ${model}: ${res.status} ${await res.text()}`);
      }
      const data: any = await res.json();
      const text = (data.content ?? [])
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n");
      return {
        model,
        html: extractHtmlBlock(text),
        rawResponse: text,
        tokens: {
          in: data.usage?.input_tokens ?? 0,
          out: data.usage?.output_tokens ?? 0,
        },
        latencyMs: Date.now() - start,
      };
    },
  };
}
