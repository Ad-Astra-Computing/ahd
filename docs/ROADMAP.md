# Roadmap

## v0.1 — shipped

- `ahd compile` CLI: brief + style token → `spec.json` + per-model prompts (Claude, GPT, Gemini, generic)
- Style-token schema and validator, `zod`-backed
- Five seed tokens: `swiss-editorial`, `neubrutalist-gumroad`, `post-digital-green`, `manual-sf`, `memphis-clash`
- Slop taxonomy (38 tells) documented
- Linter rule spec documented
- Dogfooded README artwork rendered against `swiss-editorial`
- Nix flake for reproducible builds of the `ahd` binary

## v0.2 — linter core and eval scaffold · shipped

- `ahd lint <file.html|css>` — deterministic linter with ten source-level rules:
  `no-default-grotesque`, `no-purple-blue-gradient`, `no-emoji-bullets`,
  `no-gradient-text`, `no-slop-copy`, `weight-variety`, `require-type-pairing`,
  `no-fake-testimonials`, `no-flat-dark-mode`, `no-shimmer-decoration`
- Slop-fixture and clean-fixture HTML in `tests/fixtures/` with per-rule assertions
- `ahd eval <token> --samples <dir>` — aggregates lint scores across pre-generated samples placed in `<dir>/<model>/<condition>/*.html`
- Per-model delta and per-tell frequency reporting, Markdown output
- Caveats section baked into every report

## v0.2.x — remaining linter rules

The other twenty-eight rules from `LINTER_SPEC.md`. Shippable incrementally.

- Source-level: `no-uniform-radius`, `no-three-equal-cards`, `no-lucide-in-rounded-square`,
  `no-indiscriminate-glass`, `no-gradient-text` (extended forms), `single-shadow-style`,
  `no-centered-hero`, `radius-hierarchy`, `motion-has-intent`, `cta-not-canonical`,
  `pricing-not-three`, `footer-not-four-col`, `no-default-spline`,
  `respect-reduced-motion`, `line-height-per-size`, `body-measure`,
  `tracking-per-size`, `spacing-scale-not-default`, `require-named-grid`
- Vision-only (need critic pass): `require-asymmetry`, `bento-has-anchor`,
  `no-corporate-memphis`, `no-ai-illustration`, `no-iridescent-blob`,
  `no-laptop-office-stock`, `mesh-has-counterforce`, `wordmark-not-dot-grotesque`,
  `icons-not-monoline-default`

## v0.3 — live-model evaluation

- Model runners for Claude, GPT, Gemini, Llama, DeepSeek
- `ahd eval` drives the runners directly instead of scoring pre-generated samples
- Seed brief corpus (landing page, portfolio, data-viz, editorial, documentation)
- Replace illustrative numbers in `docs/artwork/slop-distribution.svg` with measured ones
- Publish results in `docs/evals/<date>-<token>.md`, signed commits only

## v0.4 — vision critic and MCP

- `ahd critique <url|screenshot>` vision critic for the nine vision-only rules
- `ahd-mcp` MCP server exposing `brief`, `palette`, `type_system`, `reference`, `lint`, `critique`
- Works inside Claude Code, Cursor, Windsurf, Zed without workflow change

## v0.5 — token library expansion and editor plugins

- Community contribution flow (DCO, review sign-off policy)
- Targets: Heisei-Retro, Collision-Collage, Monochrome-Editorial, Bauhaus-Revival, Y2K-Frutiger, Swiss-Bleed, Post-Web3-Minimal, Magazine-Grid
- Token graduation from `draft` → `stable` after three independent sign-offs and one downstream public project usage
- `eslint-plugin-ahd` and `stylelint-plugin-ahd` wrapping the rule engine for standard editor integration

## Later

- Figma plugin that reads `.ahd/brief.yml` and lints frames in the canvas
- Vision-critic pipeline that runs on PR screenshots in CI and comments with slop-tell violations
- `ahd serve` — a preview server that hot-reloads both the brief and the output side by side
