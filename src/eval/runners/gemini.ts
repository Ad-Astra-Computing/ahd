import type {
  ModelRunner,
  ModelRunnerInput,
  ModelRunnerOutput,
} from "./types.js";
import { extractHtmlBlock } from "./types.js";

export function geminiRunner(options: {
  apiKey: string;
  model?: string;
}): ModelRunner {
  const model = options.model ?? "gemini-3-pro";
  return {
    id: model,
    provider: "google",
    async run(input: ModelRunnerInput): Promise<ModelRunnerOutput> {
      const start = Date.now();
      const body: any = {
        contents: [{ role: "user", parts: [{ text: input.userPrompt }] }],
        generationConfig: {
          maxOutputTokens: input.maxTokens ?? 4096,
        },
      };
      if (input.systemPrompt) {
        body.systemInstruction = {
          role: "system",
          parts: [{ text: input.systemPrompt }],
        };
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        throw new Error(`gemini ${model}: ${res.status} ${await res.text()}`);
      }
      const data: any = await res.json();
      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text)
          .filter(Boolean)
          .join("\n") ?? "";
      return {
        model,
        html: extractHtmlBlock(text),
        rawResponse: text,
        tokens: {
          in: data.usageMetadata?.promptTokenCount ?? 0,
          out: data.usageMetadata?.candidatesTokenCount ?? 0,
        },
        latencyMs: Date.now() - start,
      };
    },
  };
}
