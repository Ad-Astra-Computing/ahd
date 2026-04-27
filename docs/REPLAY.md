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
    provider_request_ids: [ "req-..." ]
conditions:
  requested: [ raw, compiled ]
  effective: [ raw, compiled ]
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

When the brief is plain markdown (no parser involved), the hash is taken over the **exact file bytes**. `verify-replay` will try the raw-bytes hash first; if that fails it falls back to canonical-JSON in case the brief is structured. This dual-path is documented and not a fallback for malformed input — it's the verification side of the same dual-path the helper supports.

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
- **Provider-side audit.** AHD records provider request IDs but does not save the provider's response payload. If a number is disputed, you can ask the provider to verify the request id existed at the recorded time, but you cannot recover the response from the replay block alone.
- **Determinism inside the runner.** AHD's per-sample seed is `i+1` today (incremental, not cryptographic). Different `n` will yield different sets of seeds. This is a known limitation; future versions may capture per-sample seeds.

## Markdown redactions

The markdown rendering omits `provider_request_ids` values and surfaces only a count (`provider_request_ids: 3 captured`). Until the maintainer has confirmed each provider's request ids are safe to publish, the markdown stays redacted. The full ids live in the JSON sidecar; if a published report's `.replay.json` is committed to a public repo, the ids are public.

The argv field is rendered as a quoted shell command in the markdown (in the trailing `replay this run` block) but stored as an array in the JSON to avoid quoting ambiguity.

## When to bump `schema_version`

Bump only on **breaking** schema changes (renamed/removed fields, changed semantics of an existing field). Adding optional fields does not require a bump; consumers should ignore unknown fields. Removing optional fields is breaking from the consumer's perspective, so bump.

The verifier refuses to parse `schema_version` greater than the version it was built for, on the principle that an unknown major may have changed semantics it cannot apply correctly.

## Verifying a published report

```sh
ahd verify-replay docs/evals/monthly/2026-05-04-source.md
```

Output is a per-field PASS/FAIL list. Exit code 1 on drift, 0 on clean. CI can use the exit code as a gate for merging changes that touch tokens or briefs.
