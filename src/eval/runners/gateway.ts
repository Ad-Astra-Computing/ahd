export type GatewayProvider =
  | "anthropic"
  | "openai"
  | "google-ai-studio"
  | "workers-ai";

// Security: provider API keys get sent to whatever URL this function
// returns. The original implementation accepted any http(s) URL,
// which meant a bad .env or a typo could silently route
// OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY through a
// non-Cloudflare host. The loader now only accepts:
//   - the "<account>/<gateway>" shorthand, constructed into the
//     canonical gateway.ai.cloudflare.com URL
//   - a full URL that matches the canonical host exactly
// Anything else throws; if someone legitimately wants a custom
// proxy we ask them to set a different env var.
const ALLOWED_GATEWAY_HOST = "gateway.ai.cloudflare.com";

function normalizeGatewayShorthand(raw: string): string {
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error(`CF_AI_GATEWAY is not a valid URL: ${raw}`);
    }
    if (parsed.protocol !== "https:") {
      throw new Error(
        `CF_AI_GATEWAY must use https (provider API keys go through it). Got: ${raw}`,
      );
    }
    if (parsed.hostname !== ALLOWED_GATEWAY_HOST) {
      throw new Error(
        `CF_AI_GATEWAY host must be ${ALLOWED_GATEWAY_HOST} (got ${parsed.hostname}). ` +
          `Your provider API keys are forwarded through this URL; we refuse to route credentials to a non-Cloudflare host.`,
      );
    }
    return raw.replace(/\/+$/, "");
  }
  if (/^[\w-]+\/[\w-]+$/.test(raw)) {
    return `https://${ALLOWED_GATEWAY_HOST}/v1/${raw.replace(/^\/+|\/+$/g, "")}`;
  }
  throw new Error(
    `CF_AI_GATEWAY must be "<account_id>/<gateway_id>" shorthand or a full ${ALLOWED_GATEWAY_HOST} URL (got ${raw})`,
  );
}

export function cfGatewayUrl(provider: GatewayProvider): string | undefined {
  const raw = process.env.CF_AI_GATEWAY ?? process.env.CLOUDFLARE_AI_GATEWAY;
  if (!raw) return undefined;
  const base = normalizeGatewayShorthand(raw);
  return `${base}/${provider}`;
}
