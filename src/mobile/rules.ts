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

// No-horizontal-overflow: nothing visible should extend past the right
// edge of a 375px viewport. Original rule only looked at
// document.scrollWidth > innerWidth, which misses the common pattern
// where a global `html, body { overflow-x: hidden }` safety net clips
// the overflow and silently hides the broken layout. That's exactly
// what happened on /timeline: a display headline was rendering past
// the viewport edge and getting chopped, but the document wasn't
// scrolling so the naive check passed.
//
// Now we:
//   1. Still catch genuine document-level scroll.
//   2. Walk every rendered element and flag those whose bounding rect
//      extends past the viewport right edge. Skip elements inside a
//      scrollable parent (those are legitimate horizontal-scroll
//      regions like <pre> code blocks with overflow-x: auto).
//   3. Skip elements that are clipped-but-invisible (display: none,
//      0×0 rects, aria-hidden off-screen menus).
const noHorizontalOverflow: MobileRule = {
  id: "ahd/mobile/no-horizontal-overflow",
  severity: "error",
  description:
    "Content extends past the right edge of a 375px viewport. Catches unwrapped nav, overflowing pre blocks, fixed-width tables, and display-size headlines that don't scale with the viewport.",
  check: () => {
    const out: Array<{ message: string; snippet?: string }> = [];
    const vw = window.innerWidth;
    const tolerance = 1; // sub-pixel rounding slack

    // (1) Document-level scroll — the original check, still useful.
    if (document.documentElement.scrollWidth > vw + tolerance) {
      out.push({
        message: `Document is ${document.documentElement.scrollWidth}px wide at a ${vw}px viewport. Something in the page forces horizontal scroll.`,
      });
    }

    // (2) Element-level overflow — new. A parent with overflow: hidden
    // will silently clip children, but the clipped bit is still a
    // layout bug. Walk the tree and flag elements whose bounding rect
    // extends past the viewport right edge.
    function hasScrollableAncestor(el: Element): boolean {
      let cur: Element | null = el.parentElement;
      while (cur && cur !== document.documentElement) {
        const s = window.getComputedStyle(cur);
        if (s.overflowX === "auto" || s.overflowX === "scroll") return true;
        cur = cur.parentElement;
      }
      return false;
    }

    const flagged = new Set<Element>();
    // Skip SCRIPT / STYLE / HEAD children and content that's hidden.
    const skipTags = new Set(["script", "style", "head", "meta", "link", "title"]);
    for (const el of document.querySelectorAll("body *")) {
      if (skipTags.has(el.tagName.toLowerCase())) continue;
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue; // hidden / zero-size
      if (rect.right <= vw + tolerance) continue;     // fits
      // Skip if any ancestor has horizontal scroll — legitimate region.
      if (hasScrollableAncestor(el)) continue;
      // Skip if parent already flagged — avoid duplicate parent + child fires.
      if (el.parentElement && flagged.has(el.parentElement)) continue;
      flagged.add(el);
      if (out.length < 6) {
        const text = ((el as HTMLElement).innerText || "")
          .slice(0, 60)
          .replace(/\s+/g, " ")
          .trim();
        out.push({
          message: `<${el.tagName.toLowerCase()}> extends to ${Math.round(rect.right)}px (viewport ${vw}px). Content is being clipped; find the element and make it scale / wrap.`,
          snippet: text || (el as HTMLElement).outerHTML.slice(0, 120),
        });
      }
    }

    return out;
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
