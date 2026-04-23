import type {
  ModelRunner,
  ModelRunnerInput,
  ModelRunnerOutput,
} from "./types.js";
import { extractHtmlBlock } from "./types.js";

export function ollamaRunner(options: {
  host?: string;
  model: string;
}): ModelRunner {
  const host = options.host ?? "http://127.0.0.1:11434";
  return {
    id: options.model,
    provider: "ollama",
    async run(input: ModelRunnerInput): Promise<ModelRunnerOutput> {
      const start = Date.now();
      const messages: any[] = [];
      if (input.systemPrompt)
        messages.push({ role: "system", content: input.systemPrompt });
      messages.push({ role: "user", content: input.userPrompt });
      const res = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: options.model,
          messages,
          stream: false,
          options: { num_predict: input.maxTokens ?? 4096 },
        }),
      });
      if (!res.ok) {
        throw new Error(`ollama ${options.model}: ${res.status} ${await res.text()}`);
      }
      const data: any = await res.json();
      const text = data.message?.content ?? "";
      return {
        model: options.model,
        html: extractHtmlBlock(text),
        rawResponse: text,
        tokens: {
          in: data.prompt_eval_count ?? 0,
          out: data.eval_count ?? 0,
        },
        latencyMs: Date.now() - start,
      };
    },
  };
}
