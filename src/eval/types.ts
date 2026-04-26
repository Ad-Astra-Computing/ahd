import { z } from "zod";

export type Condition = "raw" | "compiled";
export type ModelId = string;

export interface EvalSample {
  model: ModelId;
  condition: Condition;
  sampleId: string;
  html: string;
}

export interface ScoredSample {
  sample: EvalSample;
  tellsFired: string[];
  violationCount: number;
}

export interface CellCounts {
  attempted: number;
  errored: number;
  extractionFailed: number;
  scored: number;
}

export interface EvalCell {
  model: ModelId;
  condition: Condition;
  n: number;
  meanTells: number;
  perTellFrequency: Record<string, number>;
  counts: CellCounts;
  canonicalModelId: string;
}

export interface EvalReport {
  token: string;
  runAt: string;
  cells: EvalCell[];
  deltas: Array<{
    model: ModelId;
    canonicalModelId: string;
    rawMeanTells: number;
    compiledMeanTells: number;
    delta: number;
    reductionPct: number;
    rawScored: number;
    compiledScored: number;
  }>;
  caveats: string[];
  runManifest?: RunManifest;
}

export interface RunManifest {
  token: string;
  briefPath: string;
  n: number;
  maxTokens: number;
  runAt: string;
  models: Array<{
    spec: string;
    canonicalId: string;
    sanitizedId: string;
    provider: string;
    addedAt?: string;
    note?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Submission schemas (Zod is the single source of truth)
//
// `ManifestCurrentSchema` validates the manifest the shipped CLI emits today.
// `ManifestTargetSchema` adds the richer fields the contract aspires to. Both
// JSON Schema artefacts under `schema/` are generated from these definitions
// at build time (`scripts/build-schemas.mjs`); never hand-edit the JSON. A
// fixture test (`tests/submission-schema.test.ts`) parses every real
// manifest under `evals/` against ManifestCurrentSchema so a runner change
// that shifts the manifest shape fails CI before merge.
//
// Validator command: `ahd validate-submission <dir>` parses against
// `ManifestCurrentSchema` (must pass) and `ManifestTargetSchema` (warn-only,
// surfaces missing aspirational fields).
// ---------------------------------------------------------------------------

const ModelEntryCurrentSchema = z.object({
  spec: z
    .string()
    .min(1)
    .describe(
      "Runner-prefixed model spec (e.g. claude-code:claude-opus-4-7, cf:@cf/openai/gpt-oss-120b).",
    ),
  canonicalId: z
    .string()
    .min(1)
    .describe(
      "Exact model id as the provider names it; whatever the provider returns when asked, verbatim.",
    ),
  sanitizedId: z
    .string()
    .min(1)
    .describe("Filesystem-safe form of canonicalId. Used for sample directory names."),
  provider: z
    .string()
    .min(1)
    .describe(
      "Runner type that produced the samples (claude-code-cli, codex-cli, gemini-cli, cloudflare-workers-ai, anthropic, openai).",
    ),
  addedAt: z
    .string()
    .datetime({ message: "addedAt must be an ISO-8601 datetime string." })
    .optional(),
  note: z.string().optional(),
});

export const ManifestCurrentSchema = z
  .object({
    token: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/, {
        message: "token must be a kebab-case id (a-z, 0-9, hyphen).",
      }),
    briefPath: z.string().min(1),
    n: z.number().int().min(1),
    maxTokens: z.number().int().min(1).optional(),
    runAt: z
      .string()
      .datetime({ message: "runAt must be an ISO-8601 datetime string." }),
    models: z.array(ModelEntryCurrentSchema).min(1),
  })
  .strict()
  .describe(
    "AHD eval submission manifest, current shape. Validates what the shipped CLI emits today; passing this schema is the minimum bar for review.",
  );

const ModelEntryTargetSchema = ModelEntryCurrentSchema.extend({
  servingPath: z
    .string()
    .min(1)
    .describe(
      "Provider URL or canonical path (https://api.anthropic.com/v1/messages, @cf/<org>/<model>, gemini-cli://<binary-path>).",
    ),
  cliVersion: z
    .string()
    .optional()
    .describe(
      "Version string of the CLI binary used to invoke the model, where applicable.",
    ),
  runnerVersion: z
    .string()
    .min(1)
    .describe("Version of the @adastracomputing/ahd runner that produced the samples."),
  requestIds: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "Provider request-IDs captured from response headers (Anthropic request-id, OpenAI x-request-id, Cloudflare cf-ray, Google x-goog-api-client-request-id). Best-effort; populated when the provider exposes one.",
    ),
});

export const ManifestTargetSchema = ManifestCurrentSchema.extend({
  models: z.array(ModelEntryTargetSchema).min(1),
}).describe(
  "AHD eval submission manifest, target shape. Adds the per-cell fields the contract aspires to; fields are required at the target layer but accepted as missing on a current submission.",
);

export const SampleEnvelopeTargetSchema = z
  .object({
    sampleId: z.string().min(1),
    cell: z.string().min(1),
    condition: z.enum(["raw", "compiled"]),
    seed: z.number().int().optional(),
    requestId: z.string().optional(),
    finishReason: z.string().optional(),
    tokenUsage: z
      .object({
        inputTokens: z.number().int().nonnegative().optional(),
        outputTokens: z.number().int().nonnegative().optional(),
        totalTokens: z.number().int().nonnegative().optional(),
      })
      .optional(),
    rawResponse: z.string().optional(),
    extractedHtml: z.string().min(1),
    providerMeta: z.record(z.unknown()).optional(),
  })
  .describe(
    "Per-sample envelope (target shape). Captures provider response, token usage, request id and the extracted HTML. Stretch target; today samples ship as <id>.html + <id>.raw.txt without a structured envelope.",
  );

export type ManifestCurrent = z.infer<typeof ManifestCurrentSchema>;
export type ManifestTarget = z.infer<typeof ManifestTargetSchema>;
export type SampleEnvelopeTarget = z.infer<typeof SampleEnvelopeTargetSchema>;

// ---------------------------------------------------------------------------
// Rules manifest schema (Zod source of truth)
//
// schema/rules.manifest.schema.json validates the rules manifest
// shipped at the repo root, generated by scripts/build-rules-manifest.mjs
// from the rule arrays in code (lint/rules, lint/cross-rules,
// critique/critic, mobile/rules). Single source of truth lives in
// code; the manifest is a build artefact.
//
// Governance contract (Layer 1 of three; see docs/ROADMAP.md):
//   - Every rule has a manifest entry.
//   - Every manifest entry maps to a rule in code (parity test).
//   - Every entry declares status (experimental | stable | deprecated)
//     and introducedAt (semver string). Defaults exist for the
//     pre-0.9 corpus (status: stable, introducedAt: <= 0.8.x); new
//     rules MUST declare both explicitly.
//   - Recommended plugin configs exclude experimental and deprecated
//     rules. Consumers opt in via project config when they want them.
// ---------------------------------------------------------------------------

const RuleStatusSchema = z.enum(["experimental", "stable", "deprecated"]);
const SeveritySchema = z.enum(["error", "warn", "info"]);
const EngineSchema = z.enum(["source", "cross", "vision", "mobile"]);

export const RulesManifestEntrySchema = z
  .object({
    id: z
      .string()
      .regex(/^ahd\/[a-z0-9/-]+$/, {
        message: "Rule id must match ahd/<kebab-case-segment>(/<segment>)*.",
      }),
    engine: EngineSchema,
    surface: z.array(z.string()).optional().describe(
      "Subsurfaces the rule operates on (html, css, jsx, tsx, tailwind, svg, vision, mobile, etc.). Optional; mobile and vision rules typically omit since the engine implies the surface.",
    ),
    severity: SeveritySchema.describe(
      "error fails CI; warn prints; info advisory. Vision rules ship at warn by convention since they emit from a probabilistic critic.",
    ),
    status: RuleStatusSchema,
    introducedAt: z
      .string()
      .min(1)
      .describe(
        "Semver-shaped string identifying the version that first shipped the rule. Pre-0.9 rules use '<= 0.8.x'.",
      ),
    deprecatedAt: z.string().optional(),
    deprecationReason: z.string().optional(),
    description: z.string().min(1),
  })
  .strict();

export const RulesManifestSchema = z
  .object({
    version: z.string().min(1).describe(
      "Manifest format version. Independent of the framework version that generated it.",
    ),
    generatedAt: z
      .string()
      .datetime({ message: "generatedAt must be an ISO-8601 datetime string." }),
    counts: z
      .object({
        total: z.number().int().nonnegative(),
        experimental: z.number().int().nonnegative(),
        stable: z.number().int().nonnegative(),
        deprecated: z.number().int().nonnegative(),
        byEngine: z.record(EngineSchema, z.number().int().nonnegative()),
      })
      .describe(
        "Pre-computed counts for downstream consumers (parity CI, release notes, README). Derivable from `rules` but emitted to keep readers from having to recount.",
      ),
    rules: z.array(RulesManifestEntrySchema).min(1),
  })
  .strict();

export type RulesManifestEntry = z.infer<typeof RulesManifestEntrySchema>;
export type RulesManifest = z.infer<typeof RulesManifestSchema>;
