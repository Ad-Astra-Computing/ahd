export interface ModelRunnerInput {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  seed?: number;
}

export interface ModelRunnerOutput {
  model: string;
  html: string;
  rawResponse: string;
  tokens?: { in: number; out: number };
  latencyMs?: number;
}

export interface ModelRunner {
  id: string;
  provider: string;
  run(input: ModelRunnerInput): Promise<ModelRunnerOutput>;
}

export function extractHtmlBlock(text: string): string {
  const fenced = text.match(/```(?:html|HTML)?\s*\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const docMatch = text.match(/<!doctype[\s\S]*?<\/html>/i);
  if (docMatch) return docMatch[0];
  const htmlMatch = text.match(/<html[\s\S]*?<\/html>/i);
  if (htmlMatch) return htmlMatch[0];
  return text.trim();
}
