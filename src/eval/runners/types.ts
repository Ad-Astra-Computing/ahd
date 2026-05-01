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
  // Provider-side identifier for this specific call. Recorded in the
  // replay sidecar as `models[].provider_request_ids[]` so a published
  // claim can be tied back to a provider's request log. Headers we
  // pull from, in order: anthropic `request-id`, openai `x-request-id`,
  // cloudflare `cf-ray`, google `x-goog-request-id`. CLI-spawned
  // runners (claude-code, gemini-cli, codex, ollama) leave it
  // undefined — there is no HTTP envelope to read.
  requestId?: string;
}

// Pull the most specific provider request id available out of a Fetch
// response's headers. Order matters: providers that set both their own
// header AND a generic one (CF sets cf-ray plus, on the OpenAI-compat
// endpoint, x-request-id) should record the more specific value.
export function extractProviderRequestId(headers: Headers): string | undefined {
  const order = [
    "request-id",        // Anthropic
    "x-request-id",      // OpenAI; Cloudflare's OpenAI-compat endpoint
    "cf-ray",            // Cloudflare (any product)
    "x-goog-request-id", // Google / Gemini
  ];
  for (const name of order) {
    const v = headers.get(name);
    if (v) return v;
  }
  return undefined;
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
