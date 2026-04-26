# Contributing to AHD

Thanks for reading this. AHD is small enough that contributions have outsized leverage. This file explains how to make a clean one.

## Three kinds of contribution, three ways in

### 1. A new or improved lint rule

The linter is where AHD's opinions live. New rules should target a specific, observable, named slop tell. If the rule cannot be decided from HTML or CSS, it belongs in the vision critic instead.

- Add your rule under `src/lint/rules/<rule-id>.ts`.
- Import and list it in `src/lint/rules/index.ts`.
- Add fixtures to `tests/fixtures/` or augment the existing ones so your rule fires on a slop case and stays silent on a clean case.
- Run `npm test`. The suite must stay green.
- Open a PR with a short note on which slop tell the rule catches, and a reference to the taxonomy entry it implements.

### 2. A new style token

The library is the commons. A token is a full design direction.

- Start from `tokens/swiss-editorial.yml` as a template.
- Fill every field the schema requires (`src/types.ts` is the source of truth).
- Declare at least eight forbidden tells and at least one required quirk.
- Provide exemplar references in `tokens/exemplars/<token-id>/reference.md`. Public-domain or CC-licensed sources only. Attribution per the sourcing policy in `tokens/exemplars/README.md`.
- Run `npm run build && npx ahd validate-tokens`. Your token must validate.
- Run `npx ahd compile briefs/landing.yml --out /tmp/out` with `token: your-token-id` in the brief. Confirm the compiled prompt reads sensibly.
- Tokens enter at `status: draft`. Graduation to `status: stable` requires three independent review sign-offs and one documented downstream project using the token.

### 3. An eval report

We publish measured runs. If you have budget and keys, you can add to the record.

- Place the report at `docs/evals/<YYYY-MM-DD>-<token-id>.md`.
- Use the built-in report format from `ahd eval-live` or `ahd eval-image`; do not reformat by hand.
- Commit the run manifest (`evals/<token>/manifest.json`) alongside the report if the raw samples are not also committed.
- Name every caveat in the report. Negative results are first-class.

#### Submission requirements for contributor-run evals

Because an eval report is a factual claim about how a model behaved, a contributed report must be independently verifiable without the maintainer having to trust the contributor. A PR that does not meet these requirements will be asked for the missing pieces before review.

**1. Submit the full manifest, not just rendered samples.**
The output directory from `ahd eval-live` (or `ahd eval-image`) is the unit of submission. That means, per cell:

- `manifest.json` with canonical model identifier, exact serving path (e.g. `https://api.anthropic.com/v1/messages`, `@cf/<org>/<model>` on Workers AI), brief path, token ID, seed, temperature, `max_completion_tokens`, timestamp, CLI version, and runner version.
- The raw per-sample JSON envelopes (`raw/NN.json`, `compiled/NN.json`) containing attempted-byte count, extracted HTML, finish reason, token usage, and any provider metadata the runner captured. HTML alone is not enough; the envelope is what proves the sample came from the model, not a text editor.
- The compiled prompt bytes (`compiled-prompt.txt` or equivalent) exactly as sent to the provider.

**2. Include provider request-IDs when the provider exposes one.**
The runner records these automatically when the provider returns them. Keep them in the manifest:

- Anthropic: `request-id` response header.
- OpenAI / OpenAI-compatible (including Cloudflare Workers AI OpenAI endpoint): `x-request-id`.
- Cloudflare Workers AI native endpoint: `cf-ray`.
- Google / Vertex: `x-guploader-uploadid` or `x-goog-api-client-request-id` where present.

A maintainer can use these to verify through the provider that the request actually occurred, without needing to re-run the eval. This is the single strongest signal we accept.

**3. Submit n ≥ 3 per cell, same prompt, different seeds.**
A single sample per cell is not submittable. A stochastic model returning identical or near-identical output across three different seeds is the canonical fabrication / cherry-pick fingerprint. Running at `n ≥ 3` minimum makes that fingerprint visible without expensive review.

**4. Do not post-process the samples.**
Do not reformat HTML, strip whitespace, pretty-print, or re-wrap. The envelope should reflect the model's raw output. If the runner's extractor produced the HTML from a larger response, keep the full `raw_response` field in the envelope.

**5. Report negative results with the same detail as positive ones.**
A cell where compiled lost to raw, or where extraction failed, or where the model produced zero-byte output, is first-class data. Don't drop cells to make the report look cleaner. Name the failure mode; a cell that failed for a serving-layer reason (see `docs/SERVING_TELLS.md`) is worth reporting for that reason alone.

**6. Include a short runbook.**
Name every environment detail a re-runner would need: CLI versions, model version strings, any region or endpoint pinning, any feature flags, and the exact `ahd eval-live` invocation including flags. One shell block is enough. If the report's claims depend on running the eval in a specific way, that way must be written down.

#### What happens on review

- The maintainer spot-checks two or three randomly-selected samples by re-running the manifest against the same provider, using the runbook. The goal is distributional agreement, not bit-exact reproduction; stochastic sampling means output will differ. If the re-run produces a tell-count meaningfully outside the submitted distribution, we'll ask for clarification.
- If the provider exposes a request-log API and the contributor provided request-IDs, the maintainer may use those to confirm the requests occurred.
- We don't automate re-run-on-PR in CI. That would need maintainer-held keys and budget, and we'd rather spend both on new eval axes than on PR verification. The manifest-first policy above is designed to make fabrication costly enough that good-faith contribution is the cheaper path.

#### What we won't accept

- A report that includes only rendered HTML or screenshots without the envelope manifest.
- A report with `n = 1` per cell.
- A report that drops the cells where compiled lost.
- A report from a provider or model version the runner cannot address with a canonical identifier.
- "Summary" reports that elide attempted-vs-scored counts. Every column in the `ahd eval-live` report table has a reason to be there; don't remove any.

## Developer Certificate of Origin

AHD uses the [Developer Certificate of Origin 1.1](https://developercertificate.org/). By signing off your commits, you certify that you wrote the code or otherwise have the right to submit it under the project's licence.

Sign off commits with `git commit -s`. The sign-off appears as a `Signed-off-by:` line. CI rejects unsigned commits on pull requests.

## Commit style

- One logical change per commit.
- Present tense, imperative mood, under 70 characters for the subject.
- Body explains *why*, not *what*.

## Architectural rules

A small set of rules every contributor change should follow. These
exist because past defects came from the absence of one of them; they
are not aspirational style.

**1. Schema-validate every user-controlled input at the boundary.**

Every entry point that takes data from outside the process gets a
Zod parser at the entry. No silent `String()` coercion, no type
assertions on unparsed objects. Today this covers:

- Briefs (`BriefSchema`, validated by `loadBrief`)
- Style tokens (`StyleTokenSchema`, validated by `loadToken`)
- Project config (`AhdProjectConfig`, validated by `loadConfig`)
- Submission manifests (`ManifestCurrentSchema` / `ManifestTargetSchema`,
  consumed by `ahd validate-submission`)
- Every MCP tool's arguments (per-tool Zod schema in `src/mcp/server.ts`)

CLI flag parsing remains imperative (each subcommand parses its own
flags with explicit `flag()` reads and explicit `exit()` on missing
required flags). This is best-effort by design: the CLI's input
surface is small, declarative-flag-parsing libraries add a dep, and
the explicit checks read straightforwardly. If a CLI subcommand grows
beyond a few flags or starts taking structured input, lift it to a
schema.

**2. Doc surface follows code, not the other way around.**

`docs/LINTER_SPEC.md`, `docs/SLOP_TAXONOMY.md`, README rule counts,
CLI help text, and JSON Schema files are all build artefacts of the
code. When a rule lands or moves status, the doc lands in the same
commit. The `tests/submission-schema.test.ts` parity test catches one
class of drift; the others rely on this rule plus review.

**3. Schema files are generated, never hand-edited.**

`schema/*.schema.json` is regenerated from the Zod source by
`scripts/build-schemas.mjs` on every build. Hand-edits are caught by
the parity test in `tests/submission-schema.test.ts`. Touch the Zod
declarations in `src/eval/types.ts` (or wherever the source lives)
and let the build emit the JSON.

## Development

```bash
nix develop    # provides node, chromium, tsc, prefetch-npm-deps
npm install
npm run build
npm test
```

Tests must pass. `npx tsc --noEmit` must pass. `npx ahd validate-tokens` must pass.

The repo ships a pre-commit hook that runs these checks automatically. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

After that every `git commit` runs `tsc --noEmit`, `npm test`, and `ahd validate-tokens` before the commit lands. Skip in emergencies with `git commit --no-verify`, but the gate exists because every check has caught at least one real defect; bypassing it is a last resort, not a shortcut.

For live eval work, put keys in `.env` (already gitignored). Never commit a key. Never paste one into a PR description or issue.

## Governance

Maintainers:

- Jason Odoom (Ad Astra Computing)

New maintainers are added by unanimous vote of existing maintainers. Maintainer decisions on token graduation, new rules, and releases are recorded in the PR thread or the commit message, never in a side channel.

## Security

Report vulnerabilities privately to `security@adastracomputing.com`. See `SECURITY.md`.

## Licence

Code contributions are licensed under FSL-1.1-Apache-2.0. Token and artwork contributions are licensed under CC-BY-4.0 unless the token's own `licence:` field says otherwise. By submitting a contribution you agree it can be distributed under these terms.
