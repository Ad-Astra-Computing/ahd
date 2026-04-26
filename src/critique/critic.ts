import type { RuleMetadata, Violation } from "../lint/types.js";

export interface CritiqueInput {
  imageBase64?: string;
  html?: string;
  url?: string;
  token: string;
  context?: string;
}

export interface VisionRule extends RuleMetadata {
  id: string;
  description: string;
  prompt: string;
}

export const VISION_RULES: VisionRule[] = [
  {
    id: "ahd/require-asymmetry",
    description: "Page composition must not be perfectly symmetrical.",
    prompt:
      "Is the composition horizontally symmetrical across the hero and primary sections? A symmetrical score above 0.85 fires the rule.",
  },
  {
    id: "ahd/bento-has-anchor",
    description: "Bento grids need a cell of visual dominance.",
    prompt:
      "If a bento grid is present, does one cell have visual dominance (larger size, unique treatment)? If not, fire.",
  },
  {
    id: "ahd/no-corporate-memphis",
    description: "Corporate Memphis illustration style is forbidden.",
    prompt:
      "Is any illustration in the Corporate Memphis style (flat, pastel, big-headed floating figures, one accent colour)? If yes, fire.",
  },
  {
    id: "ahd/no-ai-illustration",
    description: "AI-rendered illustration with subsurface-scatter glow is forbidden.",
    prompt:
      "Is any illustration plasticky, subtly too smooth, symmetrical and sub-surface-scatter-glowy? If yes, fire.",
  },
  {
    id: "ahd/no-iridescent-blob",
    description: "3D hero blobs with iridescent shader are forbidden.",
    prompt:
      "Is there a 3D iridescent hero blob (Stripe-derived, or Spline default)? If yes, fire.",
  },
  {
    id: "ahd/no-laptop-office-stock",
    description: "Stock photo of a diverse team at a laptop is forbidden.",
    prompt:
      "Is the hero image a stock photo of a team looking at a laptop in a sunlit office? If yes, fire.",
  },
  {
    id: "ahd/mesh-has-counterforce",
    description: "Mesh gradient backdrops require a typographic counter-force.",
    prompt:
      "If a mesh gradient is present, is there a display-size (>=72px) typographic anchor with negative tracking within the first viewport? If not, fire.",
  },
  {
    id: "ahd/wordmark-not-dot-grotesque",
    description: "Lowercase grotesque + dot wordmark is a Y Combinator cliché.",
    prompt:
      "Is the wordmark a lowercase grotesque with a trailing dot, bracket or colored glyph? If yes, fire (info).",
  },
  {
    id: "ahd/icons-not-monoline-default",
    description: "Monoline Feather/Lucide icons with uniform 1.5px stroke fire info.",
    prompt:
      "Is the icon set entirely monoline with 1.5px stroke and rounded caps? If yes, fire (info).",
  },
  {
    id: "ahd/image/no-malformed-anatomy",
    description:
      "Image-generation tells: six-finger hands, twisted limbs, doubled teeth, merged fingers, extra joints.",
    prompt:
      "Are there anatomical errors — hands with the wrong finger count, malformed teeth, doubled pupils, limbs that merge or vanish? If yes, fire.",
  },
  {
    id: "ahd/image/no-midjourney-face-symmetry",
    description:
      "Impossibly symmetrical, glossy, age-smoothed human faces are a generator fingerprint.",
    prompt:
      "Are any human faces impossibly symmetrical, age-smoothed to porcelain, and glossy in the way that signals Midjourney / SDXL default rendering? If yes, fire.",
  },
  {
    id: "ahd/image/no-decorative-cursive-in-render",
    description:
      "Fake cursive or unreadable script lettering overlaid on renders is a slop tell.",
    prompt:
      "Is there any calligraphic / cursive text rendered as part of the image itself that is unreadable or obviously AI-hallucinated? If yes, fire.",
  },
  {
    id: "ahd/image/no-stock-diversity-casting",
    description:
      "Generic 'diverse team of five smiling professionals' casting pattern is a stock / Corporate-Memphis hand-me-down.",
    prompt:
      "Is the composition a generic diverse group of smiling professionals, evenly lit, each with a stock-style differentiating feature? If yes, fire.",
  },
  {
    id: "ahd/layout-deadspace",
    description:
      "A two-column section where one column is significantly taller than the other produces visible dead space in the shorter neighbour. Happens most commonly when a left column of text sits beside a right column of product cards that grow over time.",
    prompt:
      "Is there a horizontal section where one column is clearly much taller than the other, creating a stretch of empty space in the shorter column? Pay particular attention to editorial-style two-column layouts (headline/intro on one side, cards or images on the other). If the shorter column is visibly empty for more than roughly 40% of the section's rendered height while the taller column is still going, fire.",
  },
];

export interface Critic {
  id: string;
  critique(input: CritiqueInput): Promise<Violation[]>;
}

export function mockCritic(fixture: Record<string, string[]> = {}): Critic {
  return {
    id: "mock-critic",
    async critique(input) {
      const out: Violation[] = [];
      const key = input.url ?? input.context ?? "default";
      const fired = fixture[key] ?? [];
      for (const ruleId of fired) {
        const spec = VISION_RULES.find((r) => r.id === ruleId);
        out.push({
          ruleId,
          severity: "warn",
          file: input.url ?? "<screenshot>",
          message:
            spec?.description ?? `Vision rule ${ruleId} fired (mock critic).`,
        });
      }
      return out;
    },
  };
}

export function buildCriticPrompt(token: string): string {
  const rules = VISION_RULES.map(
    (r) => `- **${r.id}** — ${r.description}\n  ${r.prompt}`,
  ).join("\n");
  return `You are an anti-slop design critic operating against the AHD style token "${token}".

Evaluate the rendered design for the vision-only slop tells below. For each rule, answer only whether it fires.

Return JSON of the shape:
{
  "fired": ["ahd/rule-id", ...],
  "rationale": { "ahd/rule-id": "one short sentence explaining the verdict" }
}

RULES:
${rules}

Be strict. When unsure, do not fire. Do not include any rule id not in the list above.`;
}

interface AnthropicVisionOptions {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  baseDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function detectImageMime(base64: string): "image/png" | "image/jpeg" | "image/webp" | "image/gif" {
  const head = base64.slice(0, 24);
  if (head.startsWith("iVBORw0KGgo")) return "image/png";
  if (head.startsWith("/9j/")) return "image/jpeg";
  if (head.startsWith("UklGR") && base64.slice(24, 32).includes("V0VCUE")) return "image/webp";
  if (head.startsWith("R0lGOD")) return "image/gif";
  return "image/jpeg";
}

export function anthropicVisionCritic(options: AnthropicVisionOptions): Critic {
  const model = options.model ?? "claude-haiku-4-5-20251001";
  const maxRetries = options.maxRetries ?? 5;
  const baseDelay = options.baseDelayMs ?? 5000;
  return {
    id: `${model}-critic`,
    async critique(input) {
      if (!input.imageBase64) {
        throw new Error("anthropicVisionCritic requires an imageBase64 input");
      }
      const systemPrompt = buildCriticPrompt(input.token);
      const mediaType = detectImageMime(input.imageBase64);
      const body = JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: input.imageBase64,
                },
              },
              {
                type: "text",
                text: "Critique the above screenshot. Reply with JSON only.",
              },
            ],
          },
        ],
      });

      let attempt = 0;
      let lastErr = "";
      while (attempt <= maxRetries) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": options.apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body,
        });
        if (res.ok) {
          // Parse failures must not masquerade as "no tells fired."
          // Returning an empty array silently undercounts vision
          // violations and lets a broken critic run look like a clean
          // pass in the aggregated report. Emit an explicit
          // ahd/critic-parse-failed violation instead so the
          // per-tell frequency table shows the sample as
          // scored-but-unparsed and the operator can act (rerun,
          // bump model, investigate prompt). Mirrors the claude-code
          // critic's pattern in src/critique/critics/claude-code.ts.
          const makeParseFailure = (reason: string): Violation[] => [
            {
              ruleId: "ahd/critic-parse-failed",
              severity: "warn",
              file: input.url ?? "<screenshot>",
              message: `anthropic vision critic parse failure: ${reason}`,
            },
          ];
          const data: any = await res.json();
          const text = (data.content ?? [])
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("\n");
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            return makeParseFailure(
              `no JSON object in response (raw: ${text.slice(0, 200)})`,
            );
          }
          let parsed: any = {};
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (err) {
            return makeParseFailure(
              `JSON.parse failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
          if (!parsed || typeof parsed !== "object") {
            return makeParseFailure(`parsed value is not an object`);
          }
          if (!("fired" in parsed)) {
            return makeParseFailure(`response missing 'fired' field`);
          }
          if (!Array.isArray(parsed.fired)) {
            return makeParseFailure(`'fired' is not an array`);
          }
          return parsed.fired
            .filter((id: unknown): id is string => typeof id === "string")
            .filter((id: string) => VISION_RULES.some((r) => r.id === id))
            .map((id: string) => ({
              ruleId: id,
              severity: "warn" as const,
              file: input.url ?? "<screenshot>",
              message:
                parsed.rationale?.[id] ??
                VISION_RULES.find((r) => r.id === id)?.description ??
                "Vision rule fired",
            }));
        }
        const errText = await res.text();
        lastErr = `${res.status} ${errText.slice(0, 300)}`;
        if (res.status === 429 || res.status === 529 || res.status >= 500) {
          const retryAfter = parseFloat(res.headers.get("retry-after") ?? "0");
          const delay = retryAfter > 0
            ? retryAfter * 1000
            : baseDelay * Math.pow(2, attempt);
          await sleep(delay);
          attempt++;
          continue;
        }
        throw new Error(`vision critic ${model}: ${lastErr}`);
      }
      throw new Error(`vision critic ${model}: gave up after ${maxRetries} retries; last error: ${lastErr}`);
    },
  };
}
