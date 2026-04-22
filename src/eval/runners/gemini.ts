import type {
  ModelRunner,
  ModelRunnerInput,
  ModelRunnerOutput,
} from "./types.js";
import { extractHtmlBlock } from "./types.js";

export function geminiRunner(options: {
  apiKey: string;
  model?: string;
  baseURL?: string;
}): ModelRunner {
  const model = options.model ?? "gemini-3-pro";
  const baseURL = (
    options.baseURL ?? "https://generativelanguage.googleapis.com/v1beta"
  ).replace(/\/+$/, "");
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
      // Send the API key as a header rather than a query parameter.
      // Query strings end up in proxy logs, server access logs, browser
      // history and telemetry far more readily than headers; the
      // x-goog-api-key header is the Gemini API's documented header
      // alternative and closes that leakage surface.
      const res = await fetch(
        `${baseURL}/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": options.apiKey,
          },
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
