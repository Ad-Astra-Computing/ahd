export type GatewayProvider =
  | "anthropic"
  | "openai"
  | "google-ai-studio"
  | "workers-ai";

function normalizeGatewayShorthand(raw: string): string {
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }
  if (raw.includes("/")) {
    return `https://gateway.ai.cloudflare.com/v1/${raw.replace(/^\/+|\/+$/g, "")}`;
  }
  throw new Error(
    `CF_AI_GATEWAY must be either a full URL or "<account_id>/<gateway_id>" shorthand (got ${raw})`,
  );
}

export function cfGatewayUrl(provider: GatewayProvider): string | undefined {
  const raw = process.env.CF_AI_GATEWAY ?? process.env.CLOUDFLARE_AI_GATEWAY;
  if (!raw) return undefined;
  const base = normalizeGatewayShorthand(raw);
  return `${base}/${provider}`;
}
