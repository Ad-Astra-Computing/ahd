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

export function stripReasoningBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, "");
}

export function extractHtmlBlock(text: string): string {
  const cleaned = stripReasoningBlocks(text);
  const fenced = cleaned.match(/```(?:html|HTML)?\s*\n?([\s\S]*?)```/);
  if (fenced) {
    const body = fenced[1].trim();
    if (looksLikeHtml(body)) return body;
  }
  const docMatch = cleaned.match(/<!doctype[\s\S]*?<\/html>/i);
  if (docMatch) return docMatch[0];
  const htmlMatch = cleaned.match(/<html[\s\S]*?<\/html>/i);
  if (htmlMatch) return htmlMatch[0];
  if (looksLikeHtml(cleaned)) return cleaned.trim();
  return "";
}

function looksLikeHtml(text: string): boolean {
  if (!text) return false;
  return /<(!doctype|html|head|body|section|div|h1|h2|p|style)\b/i.test(text);
}
