import type { CrossFileRule } from "../types.js";
import { findAll, lineOf } from "../util.js";

// Cross-file rule seeded by a dogfood bug on ahd.adastra.computer: a stale
// deploy served a page whose "cross-provider run" link pointed at
// /evals/2026-04-21-swiss-cross, but the deploy hadn't rebuilt the /evals
// routes so the target 404'd. LLM-generated nav is a real source of this:
// models write <a href="/pricing"> alongside a claim about the pricing page
// that was never actually built.
//
// Detects links whose target is an internal path (starts with /) and whose
// target does not correspond to any built HTML file in the input set. Ignores
// assets (/_astro/, /_next/, common static paths), fragment-only links, and
// external URLs.
//
// Input files should carry absolute-style paths rooted at the site's dist
// directory — e.g. "/index.html", "/evals/2026-04-21-swiss/index.html".
// The engine strips the dist prefix before passing the files in.

const ASSET_PREFIXES = ["/_astro/", "/_next/", "/_app/", "/static/", "/assets/"];

// Targets with these extensions are static assets that the provenance
// runner only passes HTML/CSS for. We can't verify their presence from
// the linted file set alone, so we trust the build.
const STATIC_EXTENSIONS = /\.(svg|png|jpe?g|gif|webp|avif|ico|css|js|mjs|map|woff2?|ttf|otf|eot|pdf|xml|txt|json|webmanifest|mp4|webm|ogg|mp3|wav|zip|gz)$/i;

function normalizeTarget(href: string): string {
  let t = href.split("#")[0].split("?")[0];
  if (t.endsWith("/") && t !== "/") t = t.slice(0, -1);
  return t;
}

function knownPathsFromFiles(inputs: { file: string }[]): Set<string> {
  const paths = new Set<string>();
  for (const { file } of inputs) {
    if (!file.endsWith(".html")) continue;
    let p = file.replace(/\\/g, "/");
    if (!p.startsWith("/")) p = "/" + p;
    paths.add(p);
    const withoutIndex = p.replace(/\/index\.html$/, "") || "/";
    paths.add(withoutIndex);
    if (withoutIndex !== "/" && !withoutIndex.endsWith("/")) {
      paths.add(withoutIndex + "/");
    }
    const bare = p.replace(/\.html$/, "");
    paths.add(bare);
  }
  return paths;
}

export const rule: CrossFileRule = {
  id: "ahd/no-broken-internal-links",
  severity: "error",
  description:
    "Internal link whose target does not exist in the linted file set. AI writers hallucinate navigation; this catches links pointing at pages that were never built.",
  check: (inputs) => {
    const known = knownPathsFromFiles(inputs);
    const out: ReturnType<CrossFileRule["check"]> = [];
    for (const input of inputs) {
      if (!input.html) continue;
      const pattern = /\bhref\s*=\s*"([^"]+)"/gi;
      for (const m of findAll(input.html, pattern)) {
        const raw = m[1];
        if (!raw.startsWith("/")) continue;
        if (ASSET_PREFIXES.some((p) => raw.startsWith(p))) continue;
        if (STATIC_EXTENSIONS.test(raw.split("?")[0].split("#")[0])) continue;
        const target = normalizeTarget(raw);
        if (known.has(target)) continue;
        if (known.has(target + "/")) continue;
        if (known.has(target + ".html")) continue;
        if (known.has(target + "/index.html")) continue;
        out.push({
          ruleId: rule.id,
          severity: rule.severity,
          file: input.file,
          line: lineOf(input.html, m.index),
          message: `href="${raw}" points at a path that does not exist in the linted file set. Either build the target page or update the link.`,
          snippet: m[0].slice(0, 140),
        });
      }
    }
    return out;
  },
};
