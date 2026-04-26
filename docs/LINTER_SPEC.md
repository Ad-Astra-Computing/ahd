# AHD Linter Rule Spec

Thirty-nine slop tells across two surfaces: thirty-five source-level rules in the `ahd lint` engine (HTML/CSS/JSX detection plus three SVG-source rules) and fourteen vision rules in the `ahd critique` engine (screenshot detection). Each rule has an id, a surface, a detection method, a severity and a suggested remediation. Source rules also ship as `eslint-plugin-ahd` (JSX/TSX) and `stylelint-plugin-ahd` (CSS/Tailwind/vanilla); vision rules run only via the critic.

## Rule format

```yaml
id: ahd/no-purple-blue-gradient
surface: css | jsx | tsx | html | tailwind | vision
severity: error | warn | info
detect: <detection strategy>
fix: <auto-fix strategy or "manual">
rationale: <one-line reason, links to SLOP_TAXONOMY tell>
```

## Rules

### Web and UI

| id | surface | severity | detect |
|---|---|---|---|
| `ahd/no-default-grotesque` | css, tailwind | error | Font family resolves to Inter, Roboto, Open Sans, Poppins, Lato, Nunito, Manrope, Plus Jakarta Sans, system-ui as display or body. |
| `ahd/no-purple-blue-gradient` | css, tailwind | error | `linear-gradient` or `bg-gradient-to-*` containing any two of {indigo, purple, violet, fuchsia, pink, blue} as stops. |
| `ahd/no-centered-hero` | jsx, tsx | warn | First section contains `text-center` or `items-center justify-center` wrapping an `<h1>` plus two buttons. |
| `ahd/no-uniform-radius` | css, tailwind | error | More than 70% of interactive elements share the same `border-radius` token and that token is `rounded-2xl`, `rounded-xl` or 12–16px. |
| `ahd/no-three-equal-cards` | jsx, tsx | warn | A grid or flex row with exactly three children of identical component type and near-identical subtree shape. |
| `ahd/no-lucide-in-rounded-square` | jsx, tsx | warn | `<Zap>`, `<Shield>`, `<Sparkles>` (or any Lucide import) wrapped in a `rounded-*` container with a gradient or tinted bg. |
| `ahd/no-emoji-bullets` | jsx, tsx, html | error | List items start with an emoji character from the {✨ 🚀 ⚡ 🎯 🔒 💡 🎨 🧠} set. |
| `ahd/no-indiscriminate-glass` | css, tailwind | warn | `backdrop-blur` used on more than one distinct component in the tree. |
| `ahd/no-flat-dark-mode` | css | error | `--background-dark` or equivalent is `#0a0a0a`, `#000`, `#111`, `#0f172a` with a single accent of high chroma > 0.2 in OKLCH. |
| `ahd/single-shadow-style` | css, tailwind | warn | More than 80% of shadowed elements share the same shadow token. |
| `ahd/no-gradient-text` | css, tailwind | error | `bg-clip-text text-transparent bg-gradient-*` applied to text containing "AI" or "future" (case-insensitive). |
| `ahd/no-fake-testimonials` | vision, jsx | warn | Testimonial cards using DiceBear, UI Faces, or stock avatar domains in src. |
| `ahd/no-fake-trust-bar` | jsx, html | info | A "Trusted by" or "Backed by" section with three or more logos. The rule informs; verifying logos against real customer relationships is the reader's job. |
| `ahd/no-em-dashes-in-prose` | html, jsx | warn | Em-dashes in body prose. The single highest-confidence AI-writing tell. |
| `ahd/no-inline-style-animation` | html, jsx | warn | `style="animation:..."` or `style="transition:..."` declared inline rather than via CSS rule, breaking the reduced-motion gate. |
| `ahd/spa-shell-detected` | html | info | Document is a SPA shell (empty body, JS bundle entry). Source-level lint cannot see what the bundle renders; this surfaces the limitation rather than scoring a clean pass against an empty document. |
| `ahd/bento-has-anchor` | jsx, vision | warn | Bento grid present with no cell given explicit visual dominance (larger size, unique treatment). |
| `ahd/require-asymmetry` | vision | warn | Page composition scores > 0.85 on a horizontal symmetry metric across hero and primary sections. |
| `ahd/radius-hierarchy` | css | warn | Border-radius tokens used: fewer than two distinct values across buttons, cards and media. |
| `ahd/no-shimmer-decoration` | css, jsx | error | Diagonal shimmer animation used on non-loading elements. |
| `ahd/motion-has-intent` | jsx, css | warn | Entrance animations applied to more than 50% of above-fold elements with no stagger reason declared in a `data-motion` attribute. |
| `ahd/cta-not-canonical` | vision, jsx | info | Primary CTA matches the canonical shape: 44px tall, 12px radius, gradient fill, trailing arrow. |
| `ahd/pricing-not-three` | jsx | info | Pricing section has exactly three tiers with the middle marked "Most Popular". |
| `ahd/footer-not-four-col` | jsx | info | Footer uses the canonical four-column Product/Company/Resources/Legal pattern. |
| `ahd/no-default-spline` | jsx, html | warn | Spline scene URL matches known default/iridescent blob scenes. |
| `ahd/respect-reduced-motion` | css, jsx | error | Animations declared with no `@media (prefers-reduced-motion: reduce)` counterpart. |
| `ahd/no-slop-copy` | content, jsx | warn | Copy contains banned phrases: "build the future of", "ship faster", "AI-native", "cutting-edge", "seamless", "best-in-class", "unleash", "empower", "revolutionize". |

### Graphic and Brand

| id | surface | severity | detect |
|---|---|---|---|
| `ahd/no-corporate-memphis` | vision | warn | Illustration classifier match on Corporate Memphis embedding cluster. |
| `ahd/no-ai-illustration` | vision | warn | Classifier confidence > 0.7 on AI-rendered illustration with subsurface-scatter signature. |
| `ahd/no-iridescent-blob` | vision, jsx | warn | 3D hero asset with iridescent shader signature or Spline default blob. |
| `ahd/no-laptop-office-stock` | vision | info | Hero image matches stock-photo cluster (diverse team at laptop in sunlit office). |
| `ahd/mesh-has-counterforce` | vision, css | warn | Mesh gradient present with no typographic anchor (display size ≥ 72px with negative tracking) within 100vh. |
| `ahd/wordmark-not-dot-grotesque` | vision, svg | info | Wordmark is lowercase grotesque plus trailing dot or bracket. |
| `ahd/icons-not-monoline-default` | svg | info | Icon set is entirely uniform 1.5px stroke with rounded caps. |

### Typography and System

| id | surface | severity | detect |
|---|---|---|---|
| `ahd/weight-variety` | css | error | Fewer than three distinct font-weight values used across the page. |
| `ahd/line-height-per-size` | css | error | Single line-height value applied across display, body and caption sizes. |
| `ahd/body-measure` | css | error | Body paragraph width resolves outside 55–75ch at the primary breakpoint. |
| `ahd/tracking-per-size` | css | warn | No negative tracking on text ≥ 48px; no positive tracking on all-caps labels. |
| `ahd/require-type-pairing` | css | error | Fewer than two font families used across display and text. |
| `ahd/require-named-grid` | css, jsx | warn | No declared grid system (`ahd.grid`) in config; or layout uses only stacked flex columns with no shared column structure. Named grid is design opinion, not correctness, so this stays at warn. |

## Severity policy

- `error` fails CI. Reserved for rules with high false-positive resistance.
- `warn` prints in CI, does not fail. Most composition rules start here and graduate.
- `info` is advisory. Used for anything that is slop in 90% of cases but legitimate in the other 10%.

## Vision pass

Rules with `surface: vision` run against a screenshot rather than source. The pass is a single LLM critic call with the SLOP_TAXONOMY as system context, scored against a checklist. Shipped separately as `ahd critique <url>`.

## Config overrides

`.ahd.json` (or `ahd.config.json`) declares per-rule severity overrides at the project level:

```json
{
  "project": "dispatch",
  "overrides": [
    {
      "ruleId": "ahd/no-three-equal-cards",
      "severity": "off",
      "reason": "three tiers intentional, middle tier is loss leader per brief P-4"
    }
  ]
}
```

No silent disables. Every override carries a `reason` of at least ten characters, and the lint report's `overrides` field surfaces every applied override so reviewers can see what the project chose not to enforce and why.

Tokens with a `lint-overrides` block (a token that intentionally rejects an editorial default) translate the same shape into project-equivalent overrides at lint time. See `docs/STYLE_TOKEN_SCHEMA.md`.

### Roadmap (not yet shipped)

- Per-path / per-glob overrides (`path: src/pricing/*.tsx`). Currently overrides are repo-scoped only.
- `ahd audit` subcommand to enumerate every active override across the repo. Currently the lint report's `overrides` field is the audit surface.
- `ahd.config.yml` (YAML form). Currently JSON only.
