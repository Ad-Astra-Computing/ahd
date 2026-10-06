import { z } from "zod";
import type { InspectionFlag } from "./historical.js";

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

// One row per scored sample: the rule ids it tripped plus enough about
// the sample itself (byte length, content hash) that a published mean
// can be re-derived, and a real reduction told apart from a shorter
// page tripping fewer rules by having less surface.
export interface SampleMeasurement {
  sampleId: string;
  tellsFired: string[];
  byteLength: number;
  hash: string;
  scored: boolean;
}

export interface EvalCell {
  model: ModelId;
  condition: Condition;
  n: number;
  meanTells: number;
  perTellFrequency: Record<string, number>;
  counts: CellCounts;
  canonicalModelId: string;
  samples: SampleMeasurement[];
}

// Per docs/specs/0001-published-eval-statistic.md: the headline is
// the severity-split absolute difference, never a blended mean, with
// an interval and a derived verdict on every figure.
export interface StratumReport {
  severity: "error" | "warn" | "info";
  rawMean: number;
  cmpMean: number;
  diff: number; // rawMean - cmpMean; positive means the compiled arm has fewer tells
  ratio: number | null; // null when rawMean is below 0.5 (not estimable)
  notEstimable: boolean;
  lower: number;
  upper: number;
  verdict: string;
  // Welch t interval on the difference of per-page means, degrees of
  // freedom by Welch-Satterthwaite. Absent on a not-estimable
  // stratum, where no interval was computed at all.
  estimator?: "welch-t";
  df?: number;
  varianceFloor?: { raw: number; cmp: number };
  varianceUsed?: { raw: number; cmp: number };
  // A BCa bootstrap cross-check over the same per-sample counts,
  // recorded with the run. It never decides the verdict above.
  bootstrapCrossCheck?: {
    method: "bca";
    estimate: number;
    lower: number;
    upper: number;
    iterations: number;
    alpha: number;
    seed: number;
  };
}

export interface RuleLedgerEntry {
  rule: string;
  severity: "error" | "warn" | "info";
  d: number;
  lower: number;
  upper: number;
}

export interface ModelLedger {
  removed: RuleLedgerEntry[];
  induced: RuleLedgerEntry[];
  grossRemoved: number;
  grossInduced: number;
  net: number;
  // True when at least one rule was removed and at least one was
  // induced in the same run: a co-occurring reduction and increase.
  // This is never reported as a trade or a substitution; the arms are
  // independent samples, so page-level substitution is not
  // observable from this data.
  offsetting: boolean;
}

export interface ModelStat {
  model: ModelId;
  canonicalModelId: string;
  rawScored: number;
  compiledScored: number;
  strata: StratumReport[];
  ledger: ModelLedger;
}

export interface EvalReport {
  token: string;
  runAt: string;
  cells: EvalCell[];
  modelStats: ModelStat[];
  // Run-level, not per model: a rule induced (per the ledger's
  // existing classification) in two or more models of this run and
  // removed in none of them. Per docs/specs/0001-published-eval-statistic.md,
  // "The ledger". Empty when nothing qualifies.
  inspectionFlags: InspectionFlag[];
  caveats: string[];
  runManifest?: RunManifest;
  replay?: Replay;
}

export interface RunManifest {
  /**
   * Canonical ids present in the merged manifest that were not measured
   * by the invocation that wrote this report. Present only when the
   * output directory already held results.
   */
  carriedForward?: string[];
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
      "Runner type that produced the samples (claude-code-cli, codex-cli, antigravity-cli, cloudflare-workers-ai, anthropic, openai).",
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
      "Provider URL or canonical path (https://api.anthropic.com/v1/messages, @cf/<org>/<model>, antigravity-cli://<binary-path>).",
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

// ---------------------------------------------------------------------------
// Replay schema (eval reproducibility tooling, task #24)
//
// Every published eval report carries a Replay block at the top: enough
// information for a third party to (a) verify our claimed inputs match what we
// actually fed the runner (token + brief hashes against the named commit), and
// (b) re-run the same command at the named version. The block lands in two
// surfaces — `<report>.replay.json` (canonical, schema-validated) and a fenced
// YAML block in the markdown (human-friendly subset, derived from the JSON).
//
// True bit-for-bit reproducibility against frontier providers is impossible
// (silent model updates), so the schema captures verifiability + replayability
// as separate goals rather than promising determinism we can't enforce.
//
// See docs/REPLAY.md for the hash contract (canonical JSON ordering rule and
// the fallback to raw bytes for non-JSON briefs).
// ---------------------------------------------------------------------------

export const ReplaySchema = z
  .object({
    schema_version: z
      .literal(1)
      .describe(
        "Schema version of the Replay block itself. Bump on any breaking change to field shape; consumers should refuse to parse newer majors than they understand.",
      ),
    kind: z
      .enum(["eval-live", "critique", "eval-image"])
      .describe(
        "Which entry point produced the run. Discriminator for verify-replay so it can apply per-kind interpretation rules (e.g. brief is always null on critique runs).",
      ),
    ahd_version: z
      .string()
      .min(1)
      .describe(
        "Framework version that produced the run, as reported by the package manifest at invocation time (or AHD_VERSION env override).",
      ),
    ahd_commit: z
      .string()
      .nullable()
      .describe(
        "Full git SHA the framework was built from. Null when running outside a git repo (npm-installed package, distribution build).",
      ),
    git_dirty: z
      .boolean()
      .nullable()
      .describe(
        "True if the working tree had uncommitted changes at run time. Null when ahd_commit is null. Dirty + a SHA together mean the SHA is not the actual run state.",
      ),
    node_version: z
      .string()
      .min(1)
      .describe("process.version at invocation time."),
    platform: z
      .string()
      .min(1)
      .describe("`${process.platform}-${process.arch}` at invocation time."),
    invoked_at: z
      .string()
      .datetime({ message: "invoked_at must be an ISO-8601 datetime string." }),
    argv: z
      .array(z.string())
      .describe(
        "Full process.argv at invocation time, as a list. Replay tooling reconstructs the shell command from this; a single joined string would lose quoting.",
      ),
    token: z
      .object({
        path: z.string().min(1),
        hash: z.string().regex(/^sha256:[a-f0-9]{64}$/i),
      })
      .strict()
      .describe(
        "Hash is taken over the canonical-JSON serialisation of the resolved token (recursive key sort, no whitespace).",
      ),
    brief: z
      .object({
        path: z.string().min(1),
        hash: z.string().regex(/^sha256:[a-f0-9]{64}$/i),
      })
      .strict()
      .nullable()
      .describe(
        "Same hash discipline as token when the brief is structured (parsed YAML / JSON). For raw-bytes briefs (markdown body), the hash is over the file's exact bytes; the hash contract is documented per-entry-point in docs/REPLAY.md.",
      ),
    sampling: z
      .object({
        n: z.number().int().positive(),
        temperature: z.number().nullable(),
        seed: z.number().int().nullable(),
      })
      .strict(),
    models: z
      .array(
        z
          .object({
            id: z.string().min(1),
            provider: z.string().min(1),
            provider_request_ids: z
              .array(z.string())
              .describe(
                "Every provider-side request id captured during the run for this model. Empty array allowed (mock runner, local model, provider that doesn't return one). Plural-safe: some providers return multiple relevant ids per call.",
              ),
            sample_requests: z
              .array(
                z
                  .object({
                    condition: z.enum(["raw", "compiled"]),
                    sample: z.number().int().positive(),
                    request_id: z.string().nullable(),
                  })
                  .strict(),
              )
              .optional()
              .describe(
                "One entry per completed provider call for this model, across both conditions, in run order. request_id is null when the provider returned no id for that call, so a shorter provider_request_ids array becomes a stated count of misses instead of a silent gap. Does not cover samples that errored before a response was received. Optional: absent on backfilled blocks and runs recorded before this field existed.",
              ),
          })
          .strict(),
      )
      .describe("Empty array allowed (mock-only runs)."),
    conditions: z
      .object({
        requested: z.array(z.string()),
        effective: z.array(z.string()),
      })
      .strict()
      .describe(
        "What the user asked for vs what actually ran. Diverges when the runner skips a condition (e.g. mock-only, partial-failure resume).",
      ),
    backfilled: z
      .boolean()
      .optional()
      .describe(
        "Set to true when the block was reconstructed by scripts/backfill-replay.mjs against a report that predates the replay system. Backfilled blocks rely on git history for hashes; verify-replay still works but argv is empty and provider_request_ids cannot be recovered.",
      ),
    // Not input provenance like token/brief/models above: this is
    // output provenance, the per-sample record behind the published
    // means, kept so a figure can be re-derived offline with no
    // network and no credentials.
    measurements: z
      .array(
        z
          .object({
            model: z.string().min(1),
            condition: z.enum(["raw", "compiled"]),
            samples: z
              .array(
                z
                  .object({
                    sample_id: z.string().min(1),
                    tells: z.array(z.string()),
                    byte_length: z.number().int().nonnegative(),
                    hash: z.string().regex(/^sha256:[a-f0-9]{64}$/i),
                    scored: z.boolean(),
                    // The following are optional and additive, only
                    // populated when this run's pages were retained
                    // (docs/specs/0001-published-eval-statistic.md,
                    // "Recording"). They make each page
                    // storage-independent: re-derivable from its own
                    // record even if the retained files later move.
                    page_id: z
                      .string()
                      .min(1)
                      .optional()
                      .describe("Stable id for this page: model/arm/sample_id."),
                    generated_at: z
                      .string()
                      .datetime({ message: "generated_at must be an ISO-8601 datetime string." })
                      .optional(),
                    model: z.string().min(1).optional(),
                    arm: z.enum(["raw", "compiled"]).optional(),
                    epoch: z.string().min(1).optional(),
                    run_id: z.string().min(1).optional(),
                    harness_commit: z.string().nullable().optional(),
                    path: z
                      .string()
                      .min(1)
                      .optional()
                      .describe("Relative path of the retained page within its run directory."),
                    raw_hash: z
                      .string()
                      .regex(/^sha256:[a-f0-9]{64}$/i)
                      .optional()
                      .describe("sha256 of the raw provider response, when retained alongside the extracted page."),
                  })
                  .strict(),
              )
              .describe(
                "One entry per scored sample, in scoring order. `tells` is the sparse list of rule ids that fired on that sample, not a dense per-rule boolean row; the per-sample count and the published mean are both derivable by summing tells.length.",
              ),
          })
          .strict(),
      )
      .optional()
      .describe(
        "Per-cell sample measurements behind the published mean-tells figures. One entry per model x condition cell. Optional: absent on backfilled blocks, critique and eval-image runs, and reports recorded before this field existed.",
      ),
    // The spec (docs/specs/0001-published-eval-statistic.md,
    // "Uncertainty") says the floor, the degrees of freedom and the
    // bootstrap settings are recorded with the run, not only
    // computed and shown. This is that record.
    strata: z
      .array(
        z
          .object({
            model: z.string().min(1),
            severity: z.enum(["error", "warn", "info"]),
            estimator: z.enum(["welch-t"]).optional(),
            df: z.number().optional(),
            variance_floor: z
              .object({ raw: z.number(), cmp: z.number() })
              .strict()
              .optional(),
            variance_used: z
              .object({ raw: z.number(), cmp: z.number() })
              .strict()
              .optional(),
            bootstrap_cross_check: z
              .object({
                method: z.literal("bca"),
                estimate: z.number(),
                lower: z.number(),
                upper: z.number(),
                iterations: z.number().int(),
                alpha: z.number(),
                seed: z.number(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .optional()
      .describe(
        "Per-model, per-severity interval provenance behind the headline figures. Optional: absent on backfilled blocks, critique and eval-image runs, and reports recorded before this field existed.",
      ),
  })
  .strict();

export type Replay = z.infer<typeof ReplaySchema>;
