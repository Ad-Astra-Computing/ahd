<div align="center">

<img src="docs/artwork/ahd-mark.svg" alt="AHD — Artificial Human Design" width="920">

</div>

<br>

**AHD** is Ad Astra's open-source framework aimed at making LLMs produce design that does not look like it was produced by an LLM. v0.1 ships a brief compiler and a style-token library. The linter and the empirical eval harness that measures whether we're actually moving models off their shared median are specified in this repo but not yet built — see [docs/ROADMAP.md](docs/ROADMAP.md). The goal is specific, referenced, asymmetric, typographically honest design, compiled from a structured brief and enforced in CI. Today we have the first two pieces and the spec for the rest.

The thesis sits in one page: [docs/SLOP_TAXONOMY.md](docs/SLOP_TAXONOMY.md). Thirty-eight concrete tells that mark LLM-generated design as generated. Everything else in this repo exists to make those tells uneconomical.

The artwork on this page is hand-authored against the `swiss-editorial` token as a demonstration of the direction the framework compiles for. An automated render pipeline that emits these from `ahd compile` on CI is a v0.3 deliverable; until then, treat the SVGs as designed-by-hand-to-the-token exemplars rather than as automated output.

---

## The slop problem, in one figure

<img src="docs/artwork/slop-distribution.svg" alt="Slop-tell frequency across 50 AI-generated landing pages" width="100%">

LLMs do not hallucinate design choices. They regress to them. Ask four models for a landing page and you will get the same centred hero, the same three cards, the same purple gradient, the same Inter. The fix is not a better prompt. The fix is a framework that names the median, forbids it by default, and compiles a specific alternative every time.

*The percentages in the figure above are illustrative of the thesis, not measured output. Replacing them with real numbers from `ahd eval` is the v0.2 milestone.*

<img src="docs/artwork/slop-vs-ahd.svg" alt="Before and after: the slop median on the left, the AHD-compiled output on the right" width="100%">

---

## What AHD ships

Three cuts, in order of leverage. v0.1 is in the repo; v0.2 and v0.3 are specified, not built.

**v0.1 — brief compiler.** `ahd compile <brief.yml>` takes a structured brief, resolves it against a named style token, and emits a `spec.json` plus per-model system prompts (Claude, GPT, Gemini, generic). Nothing model-specific is hardcoded. Bring any model.

**v0.2 — MCP server.** The same library exposed as MCP tools: `ahd.brief`, `ahd.palette`, `ahd.type_system`, `ahd.reference`, `ahd.lint`, `ahd.critique`. Any MCP-capable agent picks it up without changing the user's workflow.

**v0.3 — linter.** `eslint-plugin-ahd` and `stylelint-plugin-ahd` encode the thirty-eight tells. Enforcement survives the LLM. CI fails when your agent slips back into the median. Rule spec: [docs/LINTER_SPEC.md](docs/LINTER_SPEC.md).

Across all three the real product is the style-token library. Tokens are the atomic unit of AHD: named, versioned, licence-clean, schema-validated bundles that fully describe a design direction (grid, type, colour, space, surface, forbidden list, required quirks, exemplars, per-model prompt fragments). The schema lives in [docs/STYLE_TOKEN_SCHEMA.md](docs/STYLE_TOKEN_SCHEMA.md). The community curates. The framework delivers.

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
ahd list                      # seed tokens shipped with v0.1
ahd show swiss-editorial      # inspect a token
ahd compile brief.yml --out . # per-model prompts + spec.json
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

Code is released under Apache-2.0 (patent grant included). Style tokens in `tokens/` and documentation artwork in `docs/artwork/` are released under CC-BY-4.0, unless an individual token's `licence:` field says otherwise. Attribution strings are in `LICENSE-tokens` and `NOTICE`.

Repo: `ssh://forgejo@perdurabo.ussuri-elevator.ts.net:2222/Ad_Astra_Computing_Inc/ahd.git`
