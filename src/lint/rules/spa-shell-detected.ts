import type { Rule } from "../types.js";
import { lineOf, violation } from "../util.js";

// Detect a typical SPA "shell" HTML document: a near-empty <body> whose only
// meaningful children are one or two empty mount containers (e.g. <div id="root">,
// <div id="app">, <div id="__next">), paired with a script tag pointing at a
// bundled JS path (/assets/, /_next/, /static/js/, /dist/, /build/). When this
// shape is detected the source linter cannot meaningfully score the rendered
// design: everything a user sees is produced by JS after hydration. Emit an
// info-level note so operators know to run `ahd critique <url>` for a full
// audit, which renders the page and runs the vision critic.

const SHELL_IDS = new Set([
  "root",
  "app",
  "__next",
  "__nuxt",
  "app-root",
  "svelte",
  "main",
]);

// Bundle paths emitted by common SPA toolchains.
const BUNDLE_RE =
  /<script\b[^>]*\bsrc\s*=\s*["']([^"']*(?:\/assets\/|\/_next\/|\/static\/js\/|\/dist\/|\/build\/|\.bundle\.js|\.chunk\.js)[^"']*)["'][^>]*>/i;

// Match the <body> including its attributes so we can inspect inner content.
const BODY_RE = /<body\b[^>]*>([\s\S]*?)<\/body>/i;

// Strip HTML comments and script/style/noscript blocks so they don't count as
// "visible content" when deciding whether the body is empty.
function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "");
}

// Does this element (opening tag + body) look like an empty mount container?
function isEmptyShellDiv(tagHtml: string, innerHtml: string): boolean {
  const idMatch = tagHtml.match(/\bid\s*=\s*["']([^"']+)["']/i);
  if (!idMatch) return false;
  if (!SHELL_IDS.has(idMatch[1].trim())) return false;
  // Inner must be empty or whitespace only.
  return innerHtml.trim().length === 0;
}

function bodyLooksLikeShell(bodyInner: string): boolean {
  const cleaned = stripNoise(bodyInner).trim();
  if (cleaned.length === 0) return false; // totally empty body isn't a shell either

  // Reject if any visible text or any heading / landmark is present.
  const textOnly = cleaned.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (textOnly.length > 0) return false;
  if (/<(h[1-6]|main|nav|header|footer|article|section)\b/i.test(cleaned)) {
    return false;
  }

  // Collect top-level element tags. Walk the string tracking depth so we only
  // count root-level siblings.
  const children: Array<{ tag: string; inner: string }> = [];
  const re = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    if (m.index < lastEnd) continue; // inside a previous element
    children.push({ tag: m[0], inner: m[3] });
    lastEnd = m.index + m[0].length;
  }

  if (children.length === 0 || children.length > 2) return false;
  return children.every((c) => /^<div\b/i.test(c.tag) && isEmptyShellDiv(c.tag, c.inner));
}

export const rule: Rule = {
  id: "ahd/spa-shell-detected",
  severity: "info",
  description:
    "The document is a JS-rendered SPA shell. Source lint cannot score design that is produced at runtime.",
  check: (input) => {
    if (!input.html) return [];
    const bodyMatch = input.html.match(BODY_RE);
    if (!bodyMatch) return [];
    const bundleMatch = input.html.match(BUNDLE_RE);
    if (!bundleMatch) return [];
    if (!bodyLooksLikeShell(bodyMatch[1])) return [];
    const line = lineOf(input.html, bodyMatch.index ?? 0);
    return [
      violation(
        rule,
        input,
        "SPA shell detected. Source lint cannot score JS-rendered design. Run `ahd critique <url>` for a full audit.",
        { line, snippet: bodyMatch[0].slice(0, 140) },
      ),
    ];
  },
};
