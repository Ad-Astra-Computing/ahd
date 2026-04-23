# Style Token Schema

A style token is a named, versioned bundle of constraints that fully describes a design direction. It is the atomic unit of the AHD library. Tokens are crowd-sourced, PR-reviewed, and versioned. The library is the product; the compiler and linter are delivery.

A token encodes:

1. Identity (id, name, provenance, licence)
2. Mood and anchor (named movement, reference studios, exemplar URLs)
3. Type system (families, scale, pairing rules, weights, tracking)
4. Colour system (OKLCH palette, role tokens, contrast tier)
5. Grid and space (grid kind, columns, gutters, spacing scale)
6. Surface rules (radius, borders, shadows, motion policy)
7. Forbidden list (slop tells explicitly banned in this direction)
8. Required quirks (intentional imperfections the brief must include)
9. Exemplars (few-shot images or HTML snippets)

## File layout

Tokens live in `tokens/<id>.yml`. One token per file. Exemplars sit next to the yaml in `tokens/<id>/exemplars/`.

## Schema

```yaml
id: swiss-editorial             # kebab-case, unique, permanent
name: "Swiss Editorial"
version: 0.1.0
status: stable | draft | deprecated
licence: CC-BY-4.0
authors:
  - "Jason Odoom <jason@adastracomputing.com>"
provenance:
  movement: "Swiss / International Typographic Style"
  period: "1950–1975, revived"
  references:
    - { name: "Josef Müller-Brockmann", kind: designer }
    - { name: "Armin Hofmann", kind: designer }
    - { name: "Helvetica", kind: typeface }
    - { name: "Pentagram", kind: studio, url: "https://pentagram.com" }
  exemplars:
    - path: exemplars/brockmann-concert-poster.jpg
      caption: "Beethoven concert poster, 1955"
    - path: exemplars/order-website.html
      caption: "Order (NYC) homepage, editorial Swiss treatment"

mood:
  keywords: [restrained, rational, left-aligned, typographic, confident]
  anti-keywords: [decorative, rounded, centred, pastel, playful]

type:
  families:
    display: { name: "Neue Haas Grotesk", fallback: ["Helvetica Now", "Inter"] }
    text:    { name: "Neue Haas Grotesk Text", fallback: ["Helvetica Now Text"] }
  pairing-rule: "single-family-two-optical-sizes"
  scale:
    base: 17
    ratio: 1.333
    steps: [-2, -1, 0, 1, 2, 3, 4, 5]
  weights: [300, 400, 700, 900]
  tracking:
    display: -0.02em
    body: 0
    allcaps: 0.08em
  line-height:
    display: 1.05
    h2: 1.2
    body: 1.5
  measure: 62ch

colour:
  space: oklch
  palette:
    ink:     "oklch(0.18 0 0)"
    paper:   "oklch(0.98 0.005 95)"
    spot:    "oklch(0.58 0.22 27)"     # Swiss red
    rule:    "oklch(0.18 0 0)"
    muted:   "oklch(0.55 0 0)"
  roles:
    background: paper
    foreground: ink
    accent: spot
    border: rule
  contrast-tier: WCAG-AAA

grid:
  kind: swiss-12
  columns: 12
  gutter: 24
  baseline: 8
  margin: { min: 32, preferred: "calc(100vw / 24)" }

space:
  scale: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 160]
  rhythm-note: "Require one dramatic jump per section (160 between sections)."

surface:
  radius:
    scale: [0, 2]            # mostly sharp
    rule: "radius only on pills (999) and hairline dividers (0)"
  border:
    weight: 1
    style: solid
    colour: rule
  shadow:
    policy: "forbidden; depth via rule, space and colour"
  motion:
    policy: "structural only; no entrance animations; no shimmer; respect reduced-motion"

forbidden:
  - "purple-to-blue gradients"
  - "rounded-2xl"
  - "centred heroes"
  - "three equal feature cards"
  - "Lucide icon in a gradient square"
  - "emoji bullets"
  - "glassmorphism"
  - "gradient text"
  - "fake testimonials"
  - "drop shadows"
  - "fade-up-on-scroll"
  - "AI shimmer"
  - "corporate Memphis illustration"
  - "iridescent 3D blob"

required-quirks:
  - "at least one page element bleeds past the 12-col grid on purpose"
  - "one section anchored by a single word set at display ≥ 120px with -0.02em tracking"
  - "one use of the spot colour and only one"

copy:
  voice: "declarative, short sentences, no hedges, no Oxford commas"
  banned-phrases:
    - "build the future of"
    - "ship faster"
    - "AI-native"
    - "seamless"
    - "best-in-class"

lint-overrides:
  enable-strict:
    - ahd/require-named-grid
    - ahd/body-measure
    - ahd/weight-variety
  disable:
    - id: ahd/wordmark-not-dot-grotesque
      reason: "wordmark convention acceptable under Swiss if typeset at micro with no dot"

prompt-fragments:
  system: |
    You are designing in the Swiss / International Typographic Style. Work on a
    12-column grid with 24px gutters and an 8px baseline. Set display type in
    Neue Haas Grotesk at 96–160px with tracking -0.02em. Body text in the same
    family at 17px, measure 62ch, line-height 1.5. Palette is ink on paper with
    a single spot red used exactly once. No shadows, no rounded corners except
    pills, no entrance animation. Asymmetric left-aligned composition. One
    intentional element must bleed past the grid.
  negative: |
    Do not: use a centred hero, use purple/blue gradients, use rounded-2xl,
    place three equal feature cards in a row, apply glassmorphism, use Lucide
    icons in gradient squares, use emoji bullets, use drop shadows.
  few-shot:
    - exemplars/brockmann-concert-poster.jpg
    - exemplars/order-website.html
```

## Validation

Every token is validated on PR with:

1. Schema conformance (JSON Schema in `schema/style-token.schema.json`).
2. OKLCH contrast check against declared `contrast-tier`.
3. Type pairing sanity (distinct genres unless `pairing-rule: single-family-*`).
4. Forbidden list coverage — must ban at least 8 slop tells from SLOP_TAXONOMY.
5. Exemplars present — at least two, at least one with explicit licence.

## Contribution

A token PR must include:

- `tokens/<id>.yml` passing validation
- two or more exemplars with licence declared
- one generated sample (HTML screenshot or PDF) rendered from the token via `ahd render <id> --demo`
- a one-paragraph "why this token exists" note, referencing the movement or studio and naming the slop tells it exists to block

Tokens graduate from `draft` → `stable` after three independent review sign-offs and at least one downstream usage in a public project.

## Seed library

v0.1 ships with:

- `swiss-editorial`
- `neubrutalist-gumroad`
- `post-digital-green`
- `manual-sf`
- `memphis-clash`

Everything else grows from the community.
