<div align="center">

<img src="docs/artwork/ahd-mark.svg" alt="AHD — Artificial Human Design" width="920">

</div>

<br>

**AHD** is Ad Astra's open-source framework aimed at making LLMs produce design that does not look like it was produced by an LLM. Today it ships a brief compiler, an eight-token seed library, a deterministic slop linter covering all twenty-nine source-checkable rules of the thirty-eight-tell taxonomy, a vision-critic scaffold for the remaining nine, runners for Claude / GPT / Gemini / Ollama, an MCP server, and eslint + stylelint plugin wrappers. Live-model calls and live vision critique are gated on you providing API keys; everything is testable offline via mock runners. See [docs/ROADMAP.md](docs/ROADMAP.md) for exactly what's shipped versus blocked on external resources.

The thesis sits in one page: [docs/SLOP_TAXONOMY.md](docs/SLOP_TAXONOMY.md). Thirty-eight concrete tells that mark LLM-generated design as generated. Everything else in this repo exists to make those tells uneconomical.

The artwork on this page is hand-authored against the `swiss-editorial` token as a demonstration of the direction the framework compiles for. An automated render pipeline that emits these from `ahd compile` on CI is a v0.3 deliverable; until then, treat the SVGs as designed-by-hand-to-the-token exemplars rather than as automated output.

---

## The slop problem, in one figure

<img src="docs/artwork/slop-distribution.svg" alt="Slop-tell frequency across 50 AI-generated landing pages" width="100%">

LLMs do not hallucinate design choices. They regress to them. Ask four models for a landing page and you will get the same centred hero, the same three cards, the same purple gradient, the same Inter. The fix is not a better prompt. The fix is a framework that names the median, forbids it by default, and compiles a specific alternative every time.

*The percentages in the figure above are illustrative of the thesis, not measured output. Replacing them with real numbers from `ahd eval-live` is a one-command job once API keys are dropped in `.env` — `ahd eval-live swiss-editorial --brief briefs/landing.yml --models claude-opus-4-7,gpt-5,gemini-3-pro --n 30 --report docs/evals/$(date +%Y-%m-%d)-swiss.md`.*

<img src="docs/artwork/slop-vs-ahd.svg" alt="Before and after: the slop median on the left, the AHD-compiled output on the right" width="100%">

---

## What AHD ships

**Brief compiler.** `ahd compile <brief.yml>` takes a structured brief, resolves it against a named style token, and emits a `spec.json` plus per-model system prompts (Claude, GPT, Gemini, generic). Nothing model-specific is hardcoded. Bring any model.

**Slop linter.** `ahd lint <file.html|css>` runs twenty-nine deterministic source-level rules (covering every slop tell that can be decided from HTML or CSS text). `ahd vision-rules` lists the nine vision-only rules that live behind the critic. Full rule spec: [docs/LINTER_SPEC.md](docs/LINTER_SPEC.md).

**Live-model eval.** `ahd eval-live <token> --brief b.yml --models <specs> --n 10 --report docs/evals/latest.md` runs the brief through each model, raw vs compiled, scores every sample with the linter, and writes a Markdown report with per-model deltas and per-tell frequency. Supports Claude, GPT, Gemini, **Cloudflare Workers AI** (`cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast`, Llama 4 Scout, DeepSeek R1, Qwen QwQ, Mistral — free tier, OSS models only), local Ollama, and deterministic mock runners (`mock-slop`, `mock-swiss`) for offline pipeline tests. Live runs need API keys in `.env`; CF Workers AI only needs `CF_API_TOKEN` + `CF_ACCOUNT_ID` and will run on the free tier for small sweeps.

**Vision critic.** `src/critique/critic.ts` ships the prompt scaffold, the nine vision-only rules, a mock critic for tests, and an Anthropic image-input adapter. Plug into a screenshot pipeline to finish the taxonomy coverage.

**MCP server.** `ahd mcp-serve` exposes `ahd.brief`, `ahd.list_tokens`, `ahd.get_token`, `ahd.palette`, `ahd.type_system`, `ahd.reference`, `ahd.lint`, `ahd.vision_rules` over stdio JSON-RPC. Any MCP-capable agent (Claude Code, Cursor, Windsurf, Zed) picks it up without a workflow change.

**Editor plugins.** `eslint-plugin-ahd` and `stylelint-plugin-ahd` wrap the rule engine for standard editor integration, with a recommended config that promotes error-severity rules to CI failures.

Across all of this the real product is the style-token library. Tokens are the atomic unit of AHD: named, versioned, licence-clean, schema-validated bundles that fully describe a design direction (grid, type, colour, space, surface, forbidden list, required quirks, exemplars, per-model prompt fragments). Eight ship today: `swiss-editorial`, `manual-sf`, `neubrutalist-gumroad`, `post-digital-green`, `monochrome-editorial`, `memphis-clash`, `heisei-retro`, `bauhaus-revival`. The schema lives in [docs/STYLE_TOKEN_SCHEMA.md](docs/STYLE_TOKEN_SCHEMA.md). The community curates. The framework delivers.

---

## Install

```bash
npm install -g @adastra/ahd
# or, from source
git clone ssh://forgejo@perdurabo.ussuri-elevator.ts.net:2222/Ad_Astra_Computing_Inc/ahd.git
cd ahd && npm install && npm link
```

Requires Node 20 or newer.

---

## Use

```bash
ahd list                              # seed tokens shipped with v0.1
ahd show swiss-editorial              # inspect a token
ahd compile brief.yml --out .         # per-model prompts + spec.json
ahd lint page.html                    # run the slop linter (ten rules today)
ahd lint-rules                        # list every lint rule with severity
ahd eval swiss-editorial --samples e/ # aggregate lint scores across samples
```

A minimal brief:

```yaml
intent: "landing page for a small indie music label's 2026 roster"
audience: "artists and their managers, not fans"
token: swiss-editorial
surfaces: [web]
mustInclude:
  - "a release calendar in the page, not in a modal"
mustAvoid:
  - "any reference to Web3"
```

`ahd compile` writes four prompts. Paste the one for your model. The model must cite the brief rule it is following in an inline comment on every design decision it makes. If it reaches for a forbidden pattern, the prompt tells it to stop and pick another solution.

---

## Seed tokens

| id | direction | status |
|---|---|---|
| `swiss-editorial` | Müller-Brockmann / Vignelli / Pentagram / Manual lineage | stable |
| `neubrutalist-gumroad` | Gumroad 2021-era, flat primaries, 2px black borders, hard offset shadows | stable |
| `post-digital-green` | monospace everything, 80-char grid, no radii, ASCII diagrams permitted | stable |
| `manual-sf` | editorial modernist, Söhne + Tiempos, oversized photography | stable |
| `memphis-clash` | Sottsass revival, clash colours, geometric primitives, pattern blocks | draft |

Every token forbids at least eight slop tells and declares at least one required quirk. The validator enforces both. A token earns `stable` after three independent review sign-offs and one downstream public project using it.

Contribute a token: fork, add `tokens/<id>.yml`, run `npm test`, open a PR. Contribution notes are in [docs/STYLE_TOKEN_SCHEMA.md](docs/STYLE_TOKEN_SCHEMA.md).

---

## Why this, now

Every week a new product ships that lets an LLM generate a UI. Every product ships the same UI. The median of the training distribution is a solved problem; the product problem is every surface on the web converging on that median. A framework sitting between the user and the model, compiling briefs into constrained specs and catching slop at the lint layer, is the cheapest intervention that actually changes the output distribution. That is AHD.

---

## Docs

- [docs/SLOP_TAXONOMY.md](docs/SLOP_TAXONOMY.md) — the thirty-eight tells, sourced and annotated
- [docs/LINTER_SPEC.md](docs/LINTER_SPEC.md) — every lint rule, its surface and its severity
- [docs/STYLE_TOKEN_SCHEMA.md](docs/STYLE_TOKEN_SCHEMA.md) — the token schema and contribution rules
- [docs/TESTING.md](docs/TESTING.md) — what we test today, what we test at v0.3, what we measure at v0.2
- [docs/ROADMAP.md](docs/ROADMAP.md) — v0.2 through v0.5

---

## Licence

Code is released under the **Functional Source License 1.1, Apache 2.0 Future License** (FSL-1.1-Apache-2.0). You can use, modify and redistribute AHD for any purpose except building a commercial product that competes with AHD itself. Internal use, client work, education, research and downstream non-competing products are all unrestricted from day one. Two years after each release, that release automatically converts to Apache-2.0 with its patent grant.

Style tokens in `tokens/` and documentation artwork in `docs/artwork/` are released under **CC-BY-4.0**, unless an individual token's `licence:` field says otherwise. Tokens are meant to proliferate — use them on client work, in your own products, wherever. Attribution strings are in `LICENSE-tokens` and `NOTICE`.
