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

## Developer Certificate of Origin

AHD uses the [Developer Certificate of Origin 1.1](https://developercertificate.org/). By signing off your commits, you certify that you wrote the code or otherwise have the right to submit it under the project's licence.

Sign off commits with `git commit -s`. The sign-off appears as a `Signed-off-by:` line. CI rejects unsigned commits on pull requests.

## Commit style

- One logical change per commit.
- Present tense, imperative mood, under 70 characters for the subject.
- Body explains *why*, not *what*.

## Development

```bash
nix develop    # provides node, chromium, tsc, prefetch-npm-deps
npm install
npm run build
npm test
```

Tests must pass. `npx tsc --noEmit` must pass. `npx ahd validate-tokens` must pass.

For live eval work, put keys in `.env` (already gitignored). Never commit a key. Never paste one into a PR description or issue.

## Governance

Maintainers:

- Jason Odoom (Ad Astra Computing)

New maintainers are added by unanimous vote of existing maintainers. Maintainer decisions on token graduation, new rules, and releases are recorded in the PR thread or the commit message, never in a side channel.

## Security

Report vulnerabilities privately to `security@adastra.computer`. See `SECURITY.md`.

## Licence

Code contributions are licensed under FSL-1.1-Apache-2.0. Token and artwork contributions are licensed under CC-BY-4.0 unless the token's own `licence:` field says otherwise. By submitting a contribution you agree it can be distributed under these terms.
