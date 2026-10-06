# Replay block

Every published AHD eval report carries a Replay block at the top: enough information for a third party to (a) verify our claimed inputs match what we actually fed the runner and (b) re-run the same command at the named version. The block lands in two surfaces:

- a fenced ` ```yaml ahd-replay ` block at the top of the markdown report (human-readable, derived);
- a `<report>.replay.json` sidecar next to the markdown (canonical, schema-validated).

The JSON sidecar is authoritative. The markdown is a derived view; redactions or formatting choices in the markdown never reflect back into the JSON.

## Fields

```yaml
schema_version: 1                # bump on any breaking change
kind: eval-live | critique | eval-image
ahd_version: 0.9.0               # framework version at run time
ahd_commit: <40-hex>             # null when not in a git repo
git_dirty: true | false          # null when ahd_commit is null
node_version: v22.22.2
platform: darwin-arm64
invoked_at: <ISO-8601 UTC>
argv: [ ... ]                    # full process.argv as a list
token:
  path: tokens/swiss-editorial.yml
  hash: sha256:<64-hex>
brief:                           # null on critique runs
  path: briefs/landing.yml
  hash: sha256:<64-hex>
sampling:
  n: 30
  temperature: null              # null when not set; per-call default
  seed: null                     # global seed; null when seeds vary per sample
models:
  - id: cf:@cf/google/gemma-4-26b-a4b-it
    provider: cloudflare-workers-ai
    provider_request_ids: [ "req_..." ]  # one id per successful provider
                                         # call. Empty for CLI-spawned
                                         # runners (claude-code,
                                         # antigravity-cli, codex) since
                                         # there is no HTTP envelope to
                                         # read.
    sample_requests:                    # optional, added after schema_version 1
      - condition: raw
        sample: 1
        request_id: "req_..."           # null when the provider returned none
      - condition: raw
        sample: 2
        request_id: null
conditions:
  requested: [ raw, compiled ]
  effective: [ raw, compiled ]
measurements:                           # optional, added after schema_version 1
  - model: cf:@cf/google/gemma-4-26b-a4b-it
    condition: raw
    samples:
      - sample_id: sample-001.html
        tells: [ "gradient-text", "emoji-bullet" ]
        byte_length: 4821
        hash: sha256:<64-hex>
        scored: true
        page_id: cf:@cf/google/gemma-4-26b-a4b-it/raw/sample-001  # optional, present when the run's pages were retained
        generated_at: <ISO-8601 UTC>                              # optional
        model: cf:@cf/google/gemma-4-26b-a4b-it                   # optional, repeats the parent entry's model
        arm: raw                                                  # optional, repeats the parent entry's condition
        epoch: schema1-n30-<hash prefix>-<hash prefix>             # optional
        run_id: swiss-editorial@<ISO-8601 UTC>                    # optional
        harness_commit: <40-hex>                                  # optional, null outside a git repo
        path: cf_google_gemma-4-26b-a4b-it/raw/sample-001.html    # optional, relative to the retained run directory
        raw_hash: sha256:<64-hex>                                 # optional, hash of the raw provider response
strata:                                 # optional, live reports only, added after schema_version 1
  - model: cf:@cf/google/gemma-4-26b-a4b-it
    severity: error
    estimator: welch-t
    df: 57.6
    variance_floor: { raw: 0.165, cmp: 0.165 }
    variance_used: { raw: 0.2, cmp: 0.165 }
    bootstrap_cross_check:               # cross-check only, never decides a verdict
      method: bca
      estimate: 0.3
      lower: 0.1
      upper: 0.5
      iterations: 2000
      alpha: 0.05
      seed: 42
```

## Hash contract

Hashes use SHA-256 in the form `sha256:<lower-hex 64>`. Two hash modes, one per input shape:

### Structured inputs (token, parsed-YAML brief)

The hash is taken over the **canonical-JSON serialisation of the resolved object**:

1. Parse YAML / JSON to a JS value.
2. Recursively sort object keys lexicographically. Arrays preserve order (their order is semantic).
3. `JSON.stringify` with no whitespace.
4. SHA-256 the resulting bytes.

This means a YAML file whose keys are reordered hashes identically as long as its parsed value is unchanged. Comments, whitespace and key ordering do not affect the hash. **The contract is: the parsed value, not the file.**

Reference implementation: `canonicalizeJson` + `hashJsonCanonical` in `src/eval/replay.ts`.

### Raw-bytes inputs (markdown briefs)

When the brief is plain markdown (no parser involved), the hash is taken over the **exact file bytes**. `verify-replay` will try the raw-bytes hash first; if that fails it falls back to canonical-JSON in case the brief is structured. This dual-path is documented and not a fallback for malformed input: it is the verification side of the same dual-path the helper supports.

## What changes between runs

| Field            | Stable across runs of the same command? |
| ---              | ---                                     |
| token.hash       | Yes, until the token file is edited     |
| brief.hash       | Yes, until the brief is edited          |
| ahd_commit       | Yes, until the framework moves          |
| invoked_at       | No (per-run wall clock)                 |
| provider_request_ids | No (provider-assigned per call)     |
| sampling.n / models / conditions | Yes, command-controlled     |

When `ahd verify-replay` says "drift detected," it means one of the **stable** fields is no longer stable: the token or brief on disk hashes to something other than the recorded value.

## What replay does *not* guarantee

- **Bit-for-bit reproduction.** Frontier providers update models silently; running the same command at the same git commit may produce different samples a week later. The block is a *verifiability* contract first and a *replayability* contract second.
- **Provider-side audit.** The `provider_request_ids` array holds one id per successful provider call: anthropic `request-id`, openai `x-request-id`, cloudflare `cf-ray`, google `x-goog-request-id` (extraction order documented in `src/eval/runners/types.ts:extractProviderRequestId`). With those ids you can ask the provider to verify a specific request existed at the recorded time. AHD does not save the provider's response payload, so the request id alone is not enough to recover the response. CLI-spawned runners (claude-code, antigravity-cli, codex) leave the array empty by design: there is no HTTP envelope to read.
- **Determinism inside the runner.** AHD's per-sample seed is `i+1` today (incremental, not cryptographic). Different `n` will yield different sets of seeds. This is a known limitation; future versions may capture per-sample seeds.

## Per-sample measurements (`measurements`)

`measurements` (top level) is not input provenance like token, brief, models and conditions above; it is output provenance, the per-sample record behind the published mean-tells figures. One entry per model x condition cell, each carrying `sample_id`, the sparse list of rule ids that fired (`tells`), the sample's byte length, a `sha256:` hash of its exact bytes, and whether it was scored. Summing `tells.length` across a cell's samples and dividing by the sample count reproduces the published mean offline, with no network call and no provider credentials. `byte_length` is recorded because a shorter page has less surface for rules to trip; without it, a real reduction in tells cannot be told apart from a shorter page. `measurements` is optional and additive: absent on backfilled blocks, on `critique` and `eval-image` runs, and on reports recorded before this field existed, and a sidecar written before it existed parses unchanged.

## Per-stratum interval provenance (`strata`)

`strata` (top level, live reports only) is the record the spec promises when it says the floor, the degrees of freedom and the bootstrap settings are recorded with the run, not only computed and shown. One entry per model x severity stratum: the Welch estimator and its degrees of freedom, the variance floor for each arm and the variance actually used (the two differ exactly when the floor bound), and the BCa cross-check (`bootstrap_cross_check`) with its own estimate, interval, iteration count, alpha and seed. The cross-check is recorded for a reader to inspect, never to decide a verdict; the Welch interval printed in the report is still what the verdict comes from. Optional and additive, same discipline as `measurements`: absent on backfilled blocks, on `critique` and `eval-image` runs (neither publishes a severity-split interval), and on reports recorded before this field existed.

`ahd eval-live`'s published severity-split statistic (`docs/specs/0001-published-eval-statistic.md`) consumes `tells` directly: each stratum's interval is a Welch t interval on the run's own per-page mean severity-weighted tell counts recovered from this field, not an approximation from a rounded percentage, with each arm's variance floored so a page count that never varies does not carry zero uncertainty. A BCa bootstrap over the same counts is recorded alongside as a cross-check; it never decides the verdict. This is what makes the point estimate re-derivable offline from the sidecar alone; the interval itself is not exact, since both the Welch approximation and the bootstrap's coverage are approximate, but it recomputes to the same figure from the same input every time.

## Retained pages

A hash cannot be re-linted. The `ahd/tracking-per-size` defect was only repairable because two sample corpora happened to be committed; the sixteen weekly runs were not, so that defect can never be corrected in them. `ahd eval-live --retain <dir>` copies this invocation's generated pages and raw responses into `<dir>`, a fresh directory it writes alongside the report, and writes `<dir>/pages.sidecar.json` naming, per page, the sha256 of the raw response, a page id, the generation timestamp, model, arm, epoch, run id, harness git commit and the page's relative path within the directory. These are the same optional fields listed above under `measurements.samples`; retaining pages is what populates them.

The retained directory is write-once: `--retain` refuses outright if `<dir>` already exists, so a later invocation cannot merge into, or silently overwrite, an earlier run's retained copy. This is deliberate and differs from the output directory `eval-live` writes samples to, which merges across invocations on purpose to support running one model at a time. A carried-forward cell (a model this invocation did not measure) is never copied into a retained run directory; only pages the invocation itself generated go in.

`ahd verify-retained-run <dir>` re-hashes every page named in the sidecar, and the raw response alongside it when one was retained, and fails on any mismatch or missing file. It runs entirely offline, the same as `ahd verify-replay`.

## Per-sample request provenance (`sample_requests`)

`sample_requests` (per model, alongside `provider_request_ids`) is one entry per completed provider call for that model across both conditions, in run order: `condition`, `sample` (1-indexed within that cell) and `request_id`, which is `null` when the provider returned no id for that call. This turns a `provider_request_ids` array that is shorter than the scored-sample count into a stated fact ("nine of sixty samples returned no provider id") instead of a silent gap. It does not cover samples that errored before a response was received; those already show up in the report's `errored` count. `provider_request_ids` keeps its exact current meaning and stays populated the same way; `sample_requests` only adds detail, it does not replace it. Optional and additive, same as `measurements`.

## Markdown redactions

The markdown rendering surfaces only a count (`provider_request_ids: 3 captured`) rather than the values, until each provider's ids are confirmed safe to publish. The full ids live in the JSON sidecar; if a published report's `.replay.json` is committed to a public repo, the ids are public.

The argv field is rendered as a quoted shell command in the markdown (in the trailing `replay this run` block) but stored as an array in the JSON to avoid quoting ambiguity.

## Backfilled sidecars

Reports published before the replay system existed carry a sidecar with `backfilled: true`. The hashes are reconstructed by `scripts/backfill-replay.mjs` from the token + brief contents at the report's git commit, so `ahd verify-replay` works against them as long as nobody has rewritten history. What backfilled blocks lack:

- `argv` is `[]` (the original command was not stored).
- `provider_request_ids` are empty (lost; never made it into the markdown).
- `node_version` and `platform` are `"unknown"`.
- `temperature` and `seed` are `null`.

A backfilled block is informational about runs you cannot replay verbatim, but it is still verifiable: the hashes pin the inputs to a specific git state.

## When to bump `schema_version`

Bump only on **breaking** schema changes (renamed/removed fields, changed semantics of an existing field). Adding optional fields does not require a bump; consumers should ignore unknown fields. Removing optional fields is breaking from the consumer's perspective, so bump.

The verifier refuses to parse `schema_version` greater than the version it was built for, on the principle that an unknown major may have changed semantics it cannot apply correctly.

## Verifying a published report

```sh
ahd verify-replay docs/evals/monthly/2026-05-04-source.md
```

Output is a per-field PASS/FAIL list. Exit code 1 on drift, 0 on clean. CI can use the exit code as a gate for merging changes that touch tokens or briefs.
