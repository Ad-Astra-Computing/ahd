// Mobile-layout rules. Run against a rendered page (not source), so they
// live outside the source-linter engine. Each rule produces a pure JS
// expression that page.evaluate() executes in the browser; the returned
// violations come back as plain objects.
//
// Deterministic by design: no multimodal critic, no judgment call. A
// page either overflows at 375px or it doesn't. Tap targets either
// meet the minimum height or they don't. That's the signal.
//
// These rules target the 375px viewport (iPhone mini / SE) because
// that's the narrowest widely-used device in 2026 and the width where
// layout errors surface first.

import type { Severity, Violation } from "../lint/types.js";

export interface MobileRule {
  id: string;
  severity: Severity;
  description: string;
  // The check runs inside page.evaluate() in the browser. Must be a
  // pure function that returns an array of violation objects with at
  // least `message` and optionally `snippet`.
  check: () => Array<Omit<Violation, "ruleId" | "severity" | "file">>;
}

// No-horizontal-overflow: the document itself must not scroll sideways
// at mobile widths. Any page that does has a layout bug — a pre that
// isn't clipped, a nav that didn't wrap, a table with no responsive
// treatment. Error-severity because horizontal scroll on a phone is
// actively hostile to users.
const noHorizontalOverflow: MobileRule = {
  id: "ahd/mobile/no-horizontal-overflow",
  severity: "error",
  description:
    "The document must not scroll horizontally at 375px viewport. Catches unwrapped nav, overflowing pre blocks, fixed-width tables.",
  check: () => {
    const docWidth = document.documentElement.scrollWidth;
    const viewportWidth = window.innerWidth;
    if (docWidth > viewportWidth + 1) {
      return [
        {
          message: `Document is ${docWidth}px wide at a ${viewportWidth}px viewport. Something inside main content is forcing horizontal scroll; find the element and clip / wrap / scroll it.`,
        },
      ];
    }
    return [];
  },
};

// Tap-target-size: WCAG 2.5.8 sets a 24x24 CSS-pixel minimum for
// pointer targets; Apple HIG and Material both recommend 44x44 as
// the comfort bar. AHD splits the difference and warns at <32px
// height. Inline links in flowing prose are excluded because the
// tap area there is the word itself and a 22px line-height word
// is fine; rule only fires on standalone interactive elements
// (buttons, nav links, form controls).
const tapTargetSize: MobileRule = {
  id: "ahd/mobile/tap-target-size",
  severity: "warn",
  description:
    "Interactive elements should be at least 32px tall at mobile widths. Targets below this trip the fat-finger threshold and tank one-handed usability.",
  check: () => {
    const MIN = 32;
    const findings: Array<{ message: string; snippet?: string }> = [];
    const selector = "nav a, header a, footer a, button, [role='button'], input, select";
    const seen = new Set<string>();
    for (const el of document.querySelectorAll(selector)) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue; // hidden
      if (r.height >= MIN) continue;
      const text = ((el as HTMLElement).innerText || "").slice(0, 40).replace(/\s+/g, " ").trim();
      if (!text) continue;
      const key = `${el.tagName.toLowerCase()}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        message: `${el.tagName.toLowerCase()} "${text}" is ${Math.round(r.height)}px tall (target ${MIN}px). Add vertical padding so the tap area meets the minimum.`,
        snippet: (el as HTMLElement).outerHTML.slice(0, 120),
      });
      if (findings.length >= 8) break; // cap to prevent dump
    }
    return findings;
  },
};

// Body-font-size: text below 14px CSS-px at 375px is hard to read on
// a phone. Many LLM-generated sites emit 12px body text by default
// because desktop comps scale down linearly. Warn at <14px.
const bodyFontSize: MobileRule = {
  id: "ahd/mobile/body-font-size",
  severity: "warn",
  description:
    "Body text should be at least 14px at mobile widths. Below that, one-handed reading becomes work.",
  check: () => {
    const MIN = 14;
    const body = document.body;
    if (!body) return [];
    // Check first five <p> elements; they're the canonical body-text
    // carriers. Headings, captions and UI labels legitimately go smaller.
    // Exclude label-like paragraphs (kickers, captions, meta rows,
    // small-text footers). These are intentionally smaller than body
    // text and firing on them would make the rule too noisy. The rule
    // targets substantive paragraphs that carry real content.
    const LABEL_CLASSES = /\b(kicker|eyebrow|caption|meta|label|muted|small|byline|footnote|micro)\b/i;
    const all = Array.from(document.querySelectorAll("main p, article p, section p"));
    const paras = all
      .filter((p) => !LABEL_CLASSES.test((p as HTMLElement).className || ""))
      .filter((p) => {
        // Also exclude tiny utility text under 80 chars — these are
        // almost always labels or UI strings, not body copy.
        const text = (p.textContent || "").trim();
        return text.length >= 80;
      })
      .slice(0, 5);
    const findings: Array<{ message: string; snippet?: string }> = [];
    for (const p of paras) {
      const fontSize = parseFloat(window.getComputedStyle(p).fontSize);
      if (fontSize < MIN) {
        findings.push({
          message: `<p> renders at ${fontSize}px (minimum ${MIN}px). Readers have to zoom. Bump body font size for the mobile viewport.`,
          snippet: (p.textContent || "").slice(0, 80).replace(/\s+/g, " ").trim(),
        });
      }
    }
    return findings;
  },
};

// Viewport-meta-present: this is the one source-level check that
// belongs in the mobile bundle because without it the other checks
// would fire constantly (desktop render in a mobile viewport = every
// font is 9px, every button tiny, document overflows). Missing
// viewport meta means the site isn't serious about mobile at all.
const viewportMetaPresent: MobileRule = {
  id: "ahd/mobile/viewport-meta-present",
  severity: "error",
  description:
    "<meta name=\"viewport\" content=\"width=device-width, ...\"> must be present. Without it, mobile browsers render the page at desktop width and scale down, defeating every other mobile treatment.",
  check: () => {
    const meta = document.querySelector('meta[name="viewport" i]');
    if (!meta) {
      return [
        {
          message: `No <meta name="viewport"> tag found. Add <meta name="viewport" content="width=device-width, initial-scale=1"> to <head>.`,
        },
      ];
    }
    const content = (meta.getAttribute("content") || "").toLowerCase();
    if (!content.includes("width=device-width")) {
      return [
        {
          message: `viewport meta exists but does not declare width=device-width. Current: "${content}". Add width=device-width, initial-scale=1.`,
        },
      ];
    }
    return [];
  },
};

export const MOBILE_RULES: MobileRule[] = [
  viewportMetaPresent,
  noHorizontalOverflow,
  tapTargetSize,
  bodyFontSize,
];
