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

import type { RuleMetadata, Severity, Violation } from "../lint/types.js";

export interface MobileRule extends RuleMetadata {
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

// Scrollable-no-affordance: a horizontally-scrollable region with the
// scrollbar hidden and no other scroll cue is a usability dead end on
// touch devices. The user can swipe to discover the content but
// nothing in the visual signals that more content exists. The pattern
// shows up constantly in LLM-generated nav rows, tab bars and chip
// lists where the model emits `overflow-x: auto; scrollbar-width:
// none; ::-webkit-scrollbar { display: none }` because that is what
// it has seen on shadcn / Tailwind blocks, and forgets that a
// hidden-scrollbar pattern needs an alternative affordance.
//
// Affordances we accept (rule does NOT fire when any of these is
// present):
//   - `scroll-snap-type` non-none on the scroller (snap is itself a
//     tactile cue)
//   - a `mask-image` / `-webkit-mask-image` linear-gradient on the
//     scroller (the canonical edge-fade)
//   - a `data-scroll-affordance` attribute, value `true|fade|cue`
//     (explicit operator opt-out: "I've handled this another way")
//   - the scrollbar is *visible* (scrollbar-width auto/thin and the
//     webkit pseudo not display:none)
//
// Detection pattern: for every element, if its computed overflow-x
// is auto/scroll AND scrollWidth > clientWidth AND the scrollbar is
// hidden AND no affordance is present, fire.
const scrollableNoAffordance: MobileRule = {
  id: "ahd/mobile/scrollable-no-affordance",
  severity: "warn",
  status: "experimental",
  introducedAt: "0.9.0",
  description:
    "A horizontally-scrollable region hides its scrollbar without a replacement cue. Add scroll-snap, an edge-fade mask, or a data-scroll-affordance opt-out so touch users can see that more content exists.",
  check: () => {
    const out: Array<{ message: string; snippet?: string }> = [];
    const seen = new Set<string>();

    function hasEdgeFadeMask(s: CSSStyleDeclaration): boolean {
      const mask = s.maskImage || (s as any).webkitMaskImage || "";
      return /linear-gradient/i.test(mask);
    }

    function hasVisibleScrollbar(s: CSSStyleDeclaration): boolean {
      // scrollbar-width values: auto | thin | none. auto/thin = visible.
      // We treat anything that isn't 'none' as visible enough.
      const sw = (s as any).scrollbarWidth ?? "";
      return sw !== "none";
    }

    function hasSnap(s: CSSStyleDeclaration): boolean {
      const snap = (s as any).scrollSnapType ?? "";
      return snap.trim() !== "" && snap !== "none";
    }

    for (const el of document.querySelectorAll("body *")) {
      const s = window.getComputedStyle(el);
      const ox = s.overflowX;
      if (ox !== "auto" && ox !== "scroll") continue;
      const he = el as HTMLElement;
      // Has actual overflow content?
      if (he.scrollWidth <= he.clientWidth + 1) continue;
      // Has any of the accepted affordances?
      if (hasSnap(s)) continue;
      if (hasEdgeFadeMask(s)) continue;
      if (hasVisibleScrollbar(s)) continue;
      const opt = he.getAttribute("data-scroll-affordance");
      if (opt && /^(true|fade|cue|snap)$/i.test(opt)) continue;
      // Dedup by tag + first-class for short reports.
      const key = `${el.tagName.toLowerCase()}|${(he.className || "").slice(0, 30)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const text = (he.innerText || "").slice(0, 60).replace(/\s+/g, " ").trim();
      out.push({
        message: `<${el.tagName.toLowerCase()}> scrolls (${he.scrollWidth}px content in ${he.clientWidth}px) with hidden scrollbar and no scroll-snap, edge-fade mask or data-scroll-affordance opt-out. Touch users have no cue that more content exists.`,
        snippet: text || he.outerHTML.slice(0, 120),
      });
      if (out.length >= 6) break;
    }

    return out;
  },
};

// List-mark-alignment: in a vertical list of rows that each begin with
// a leading "mark" (a bracketed glyph in a span, an svg icon, a bullet
// inside a wrapper), the marks are visually meant to form a column.
// When the marks have different rendered widths and nothing reserves a
// fixed slot for them (`min-width`, `width`, a grid template), the
// content after each mark lands at a different x and the column
// alignment that the marks were meant to create breaks.
//
// Canonical case (the one the bug originated on): a Footer with two
// `<a>` rows, each starting with `<span class="...mark">[¶]</span>` or
// `<span class="...mark">[›_]</span>`. The two marks differ in
// rendered width by a few pixels, so without `min-width: 4ch` on the
// span wrapper, "Contribute" sits at a different x on each row.
//
// Detection pattern: walk every element with ≥2 direct same-tag
// children that are visually stacked (each row's top > previous row's
// bottom) and visible. For each row, find the x of the first text
// content that is NOT inside the leading inline element. If the
// post-mark text x differs across rows by more than 2px, fire on the
// parent.
//
// Skips rows where there is no post-mark text (so a plain `<ul>` of
// `<li>Apple</li>` rows doesn't fire — there is no "mark" to align).
// Tolerance is 2px to absorb sub-pixel rounding without missing real
// 4–8px offsets that read as obvious bugs.
const listMarkAlignment: MobileRule = {
  id: "ahd/mobile/list-mark-alignment",
  severity: "warn",
  status: "experimental",
  introducedAt: "0.10.0",
  description:
    "A vertical list of rows that each start with a leading mark (bracketed glyph wrapper, icon, bullet) has misaligned post-mark content because the marks differ in rendered width and nothing reserves a fixed slot. Add min-width / width to the mark wrapper so all rows align.",
  check: () => {
    const out: Array<{ message: string; snippet?: string }> = [];

    function postMarkTextX(row: Element): number | null {
      // Find the first inline child (element or non-empty text node).
      // That child is the candidate "mark"; we then measure the x of
      // the first text that follows it. The candidate is rejected
      // (rule does not apply) when:
      //   - it is wider than half the row's width — it is not a
      //     compact prefix, it is the row's content
      //   - it is taller than ~1.5 line-heights — it is wrapping
      //     prose, not a single-line mark
      //   - the post-mark text's first line is not on the same
      //     baseline as the mark — the post-mark content has wrapped
      //     to its own line, so its x is determined by the parent's
      //     content edge, not by the mark width
      let firstInline: Node | null = null;
      for (const c of Array.from(row.childNodes)) {
        if (c.nodeType === 1) {
          firstInline = c;
          break;
        }
        if (c.nodeType === 3 && (c.nodeValue || "").trim()) {
          firstInline = c;
          break;
        }
      }
      if (!firstInline) return null;

      const rowRect = row.getBoundingClientRect();
      let markRect: DOMRect | null = null;
      if (firstInline.nodeType === 1) {
        markRect = (firstInline as Element).getBoundingClientRect();
      } else {
        const r = document.createRange();
        r.selectNodeContents(firstInline);
        markRect = r.getBoundingClientRect();
      }
      if (markRect.width === 0 || markRect.height === 0) return null;
      if (markRect.width > rowRect.width * 0.5) return null;
      const lineHeight =
        parseFloat(window.getComputedStyle(row).lineHeight) ||
        parseFloat(window.getComputedStyle(row).fontSize) * 1.5 ||
        24;
      if (markRect.height > lineHeight * 1.5) return null;

      const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const t = (n.nodeValue || "").trim();
        if (!t) continue;
        if (firstInline.nodeType === 3 && n === firstInline) continue;
        if (
          firstInline.nodeType === 1 &&
          (firstInline as Element).contains(n)
        ) {
          continue;
        }
        const r = document.createRange();
        r.selectNodeContents(n);
        const rects = r.getClientRects();
        if (rects.length === 0) continue;
        const firstLine = rects[0];
        if (firstLine.width === 0 || firstLine.height === 0) continue;
        // Post-mark text must share the mark's baseline; otherwise
        // its x is whatever the parent's content edge is, not a
        // function of the mark width.
        if (Math.abs(firstLine.top - markRect.top) > lineHeight * 0.75) {
          return null;
        }
        return firstLine.left;
      }
      return null;
    }

    const seen = new Set<Element>();
    for (const parent of Array.from(document.querySelectorAll("body *"))) {
      if (seen.has(parent)) continue;
      const children = Array.from(parent.children);
      if (children.length < 2) continue;
      const tag = children[0].tagName;
      if (!children.every((c) => c.tagName === tag)) continue;

      // Visually stacked + visible.
      const rects = children.map((c) => c.getBoundingClientRect());
      let stacked = true;
      for (let i = 0; i < rects.length; i++) {
        if (rects[i].height === 0 || rects[i].width === 0) {
          stacked = false;
          break;
        }
        if (i > 0 && rects[i].top < rects[i - 1].bottom - 1) {
          stacked = false;
          break;
        }
      }
      if (!stacked) continue;

      const xs = children.map(postMarkTextX);
      if (xs.some((x) => x === null)) continue;
      const numeric = xs as number[];
      const min = Math.min(...numeric);
      const max = Math.max(...numeric);
      if (max - min <= 2) continue;

      // Mark this parent and all its ancestors as seen so a wrapper
      // div doesn't double-report the same misalignment.
      seen.add(parent);
      let p: Element | null = parent.parentElement;
      while (p) {
        seen.add(p);
        p = p.parentElement;
      }

      const parentTag = parent.tagName.toLowerCase();
      const childTag = tag.toLowerCase();
      out.push({
        message: `Vertical list of <${childTag}> rows in <${parentTag}> has misaligned post-mark content (${(max - min).toFixed(1)}px spread). Reserve a fixed slot for the leading mark (min-width / width on the mark wrapper) so all rows align.`,
        snippet: (parent.outerHTML || "").slice(0, 160),
      });
      if (out.length >= 6) break;
    }

    return out;
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
  scrollableNoAffordance,
  listMarkAlignment,
];
