import type { Violation } from "../lint/types.js";

export interface CritiqueInput {
  imageBase64?: string;
  html?: string;
  url?: string;
  token: string;
  context?: string;
}

export interface VisionRule {
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

export function anthropicVisionCritic(options: {
  apiKey: string;
  model?: string;
}): Critic {
  const model = options.model ?? "claude-opus-4-7";
  return {
    id: `${model}-critic`,
    async critique(input) {
      if (!input.imageBase64) {
        throw new Error("anthropicVisionCritic requires an imageBase64 input");
      }
      const systemPrompt = buildCriticPrompt(input.token);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": options.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
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
        }),
      });
      if (!res.ok) {
        throw new Error(`vision critic ${model}: ${res.status} ${await res.text()}`);
      }
      const data: any = await res.json();
      const text = (data.content ?? [])
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n");
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];
      let parsed: any = {};
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return [];
      }
      const fired = Array.isArray(parsed.fired) ? parsed.fired : [];
      return fired
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
    },
  };
}
