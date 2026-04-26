import { z } from "zod";

export const StyleTokenSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  version: z.string(),
  status: z.enum(["stable", "draft", "deprecated"]),
  licence: z.string(),
  authors: z.array(z.string()),
  provenance: z.object({
    movement: z.string(),
    period: z.string().optional(),
    references: z.array(
      z.object({
        name: z.string(),
        kind: z.enum(["designer", "studio", "typeface", "work"]),
        url: z.string().url().optional(),
      }),
    ),
    exemplars: z.array(
      z.object({ path: z.string(), caption: z.string().optional() }),
    ),
  }),
  mood: z.object({
    keywords: z.array(z.string()),
    "anti-keywords": z.array(z.string()),
  }),
  type: z.object({
    families: z.object({
      display: z.object({ name: z.string(), fallback: z.array(z.string()) }),
      text: z.object({ name: z.string(), fallback: z.array(z.string()) }),
    }),
    "pairing-rule": z.string(),
    scale: z.object({
      base: z.number(),
      ratio: z.number(),
      steps: z.array(z.number()),
    }),
    weights: z.array(z.number()),
    tracking: z.record(z.string()),
    "line-height": z.record(z.number()),
    measure: z.string(),
  }),
  colour: z.object({
    space: z.literal("oklch"),
    palette: z.record(z.string()),
    roles: z.record(z.string()),
    "contrast-tier": z.enum(["WCAG-AA", "WCAG-AAA"]),
  }),
  grid: z.object({
    kind: z.string(),
    columns: z.number().optional(),
    gutter: z.number().optional(),
    baseline: z.number().optional(),
    margin: z.any().optional(),
  }),
  space: z.object({
    scale: z.array(z.number()),
    "rhythm-note": z.string().optional(),
  }),
  surface: z.object({
    radius: z.any(),
    border: z.any(),
    shadow: z.any(),
    motion: z.any(),
  }),
  forbidden: z.array(z.string()).min(8),
  "required-quirks": z.array(z.string()),
  copy: z
    .object({
      voice: z.string().optional(),
      "banned-phrases": z.array(z.string()).optional(),
    })
    .optional(),
  "lint-overrides": z
    .object({
      "enable-strict": z.array(z.string()).optional(),
      disable: z
        .array(z.object({ id: z.string(), reason: z.string() }))
        .optional(),
    })
    .optional(),
  "prompt-fragments": z.object({
    system: z.string(),
    negative: z.string(),
    "few-shot": z.array(z.string()).optional(),
  }),
});

export type StyleToken = z.infer<typeof StyleTokenSchema>;

// Briefs are the primary user input alongside tokens. They drive the
// compiler and the eval-live runner. Validating them at load time
// (parity with token validation in src/load.ts) gives users a clear
// schema error instead of a deep stack trace from `surfaces.join`
// when a field is missing or malformed.
// .strict() rejects unknown keys. Without it, a typo like `mustInlcude`
// or `surface` (singular) silently validates while the intended
// instruction is dropped on the floor; the user only finds out when
// the model output mysteriously ignores a constraint. Strict mode
// surfaces the typo as a brief-load error instead.
export const BriefSchema = z
  .object({
    intent: z.string().min(1, "brief.intent must be a non-empty string"),
    audience: z.string().optional(),
    // Token may be omitted when the caller passes one explicitly
    // (eval-live, ahd try --token <id>). When present in the file it
    // must be a valid kebab-case id.
    token: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/, {
        message: "brief.token must be a kebab-case token id (a-z, 0-9, hyphen).",
      })
      .optional(),
    surfaces: z
      .array(z.enum(["web", "print", "identity", "illustration"]))
      .min(1, "brief.surfaces must list at least one surface."),
    mustInclude: z.array(z.string()).optional(),
    mustAvoid: z.array(z.string()).optional(),
  })
  .strict();

export type Brief = z.infer<typeof BriefSchema>;

export interface CompiledBrief {
  brief: Brief;
  token: StyleToken;
  prompts: Record<"claude" | "gpt" | "gemini" | "generic", string>;
  spec: Record<string, unknown>;
}
