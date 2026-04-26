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
