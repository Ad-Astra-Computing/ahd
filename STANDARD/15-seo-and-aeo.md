# SEO and AEO

Every product website is built to be found, by search engines and by the
answer engines people now ask instead. Establish both at launch and keep
them accurate and current: stale facts and broken structure cost you
ranking, citations and trust. The semantic structure this needs also
serves accessibility, so it is defined once in `06-ui-ux.md` and referenced
here, not restated.

## Technical SEO

### Crawling and indexing

- A `robots.txt` at the domain root. It controls crawling, not indexing. To
  keep a page out of the index use a `noindex` meta tag or `X-Robots-Tag`
  header, and do not also block it in robots.txt, or the crawler never sees
  the `noindex`.
- List the sitemap in robots.txt, and ship an auto-generated XML sitemap of
  canonical, indexable, 200-status URLs only.
- One canonical URL per piece of content with `<link rel="canonical">`. Pick
  one host and one scheme, keep the trailing-slash policy consistent, and
  301-redirect the variants.
- Guard against an accidental `noindex`. A stray one shipped from staging is
  the classic deindexing incident, so make "no unexpected noindex or
  Disallow on production" a release check.

### On-page

- One descriptive `<title>` per page, unique across the site, and one
  `<meta name="description">`.
- One `<h1>` and a nested heading tree, descriptive link text, and alt text
  on informative images. These are the accessibility rules in `06-ui-ux.md`;
  they serve search and answer crawlers at the same time.

### Structured data

Use JSON-LD. The types that matter for a product or company site are
`Organization` with `logo` and `sameAs`, `WebSite`, `BreadcrumbList`,
`Article` with `author` and `dateModified`, `Product` with an `Offer`,
`SoftwareApplication`, and `FAQPage` or `HowTo` where they genuinely apply.
Mark up only content visible on the page, and match the page exactly.
Deceptive, hidden or irrelevant markup risks a manual action. Valid markup
enables a rich result, it never guarantees one.

### Preview and performance

- Open Graph and Twitter Card tags for link unfurling, with a 1200 by 630
  image.
- Core Web Vitals, measured at the 75th percentile of real-user field data:
  LCP at or under 2.5 seconds, INP at or under 200 milliseconds, CLS at or
  under 0.1. It is a tiebreaker signal, so chase it for the user experience,
  not only for rank. HTTPS everywhere, and responsive for mobile-first
  indexing.
- Real 404s return a 404 or 410, never a soft 404 that returns 200 on an
  error page. Use 301 for a permanent move, avoid redirect chains, and point
  internal links at the final URL.

## AEO, being cited by answer engines

- Answer first. Lead each section with a direct, self-contained answer in a
  few sentences, then elaborate. Extractors lift concise, quotable passages.
- Define the entity. A crisp statement of what the product is and does, the
  same name and description everywhere, and `Organization` schema with
  `sameAs`, so a model forms the right entity for the brand.
- Write question-shaped content: FAQs, how-to guides and glossary pages that
  mirror how people ask. Keep it skimmable with headings, short paragraphs,
  lists and tables.
- Show expertise: named authors, sourced claims, a visible `dateModified`.
  These are the same signals a helpful-content system rewards.
- Earn third-party citations. Answer engines lean on sources they already
  trust, so an accurate presence on reputable docs, press and community
  sites carries more weight than any on-site tweak. Put facts, prices and
  model numbers in real text, not an image or a script.
- `llms.txt` is optional and experimental. It is a community proposal with
  no confirmed adoption by the major AI crawlers, so add it as a low-cost
  docs index if useful, and never let it displace real structured content.
- Allow the retrieval crawlers so you can be cited: `OAI-SearchBot`,
  `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot` and
  Googlebot. Blocking them makes you invisible in AI answers. Whether to
  also allow the training crawlers (`GPTBot`, `Google-Extended`, `ClaudeBot`,
  `CCBot`) is a separate brand call. The trap to avoid: blocking a
  provider's training bot while forgetting to allow its paired search bot,
  which drops you from that engine's citations.

AEO is newer and less settled than SEO. Build on the fundamentals above, the
accurate, well-structured, authoritative content with valid schema, and
treat the rest as experiments to measure, not requirements.

## A page is not shipped until it can be found

Publishing a page and linking it from the site is half the work. Until it is
discoverable it is invisible to search, to answer engines and to anyone who
shares the link. Treat the following as part of shipping the page, not as a
later pass:

- An entry in the sitemap, and a `lastmod` that is true. Where a build knows
  the real date, such as from the commit that last changed the content, the
  build writes it. A hand-kept date drifts and then lies.
- A `<title>` unique across the site, a `<meta name="description">`, and a
  `<link rel="canonical">` naming that page and no other.
- Open Graph and Twitter Card tags, image included, or the first person to
  share it posts a bare link.
- Structured data describing what the page actually shows.
- No `noindex` that was not intended.

Enforce it with a test that walks every built page rather than a checklist
someone remembers. Ours found four new pages with none of the above, five
older pages with no preview tags at all, and a sitemap claiming the policies
last changed two months before they did.

## Keeping it current

- On every release: no accidental `noindex` or `Disallow` on production, the
  sitemap is valid, titles and canonical are present, structured data
  validates, and there are no soft 404s.
- Monthly: review Search Console for coverage errors, Core Web Vitals and
  manual actions, scan for broken links, and check the crawler logs match
  the allow-or-block stance you intended.
- Quarterly: audit content for freshness and accuracy, re-validate every
  schema type, and review the robots.txt AI-crawler policy against the
  current bot names.

## Anti-patterns

- Keyword stuffing, cloaking, and doorway pages.
- Fake, irrelevant or hidden structured data, which risks a manual action.
- Thin or duplicate content, and missing canonicals across duplicates.
- Buying or exchanging links.
- Mass-produced filler with no original value. The problem is low quality,
  not that a tool helped write it, and the prose rules in
  `00-prose-and-output.md` apply. Fabricated facts or specs are worse for
  AEO: answer engines cross-check, and being caught wrong erodes the trust
  that earns a citation.

## Sources

- Creating helpful content, Google: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Structured data guidelines, Google: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Introduction to robots.txt, Google: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Core Web Vitals thresholds, web.dev: https://web.dev/articles/defining-core-web-vitals-thresholds
- The llms.txt proposal: https://llmstxt.org/
