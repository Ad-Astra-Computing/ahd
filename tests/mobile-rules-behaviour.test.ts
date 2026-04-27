import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { chromium, type Browser } from "playwright-core";
import { MOBILE_RULES } from "../src/mobile/rules.js";

// Browser-behaviour smoke for the new ahd/mobile/scrollable-no-affordance
// rule. The other four mobile rules retain descriptor-only coverage at
// v0.9; their fixture coverage is queued with the calibration-corpus
// work in v0.10. This file exists to discharge the immediate residual
// risk: the experimental scrollable-no-affordance rule is novel
// detection logic that has not been exercised against a real DOM until
// now. We load minimal HTML fixtures via page.setContent (no network),
// run the rule's check inside the browser, and assert the violation
// shape against expected outcomes.
//
// Skips cleanly when Chromium is not available so CI environments
// without a browser binary do not fail on infrastructure rather than
// on rule behaviour.

function findChromium(): string | undefined {
  const env = process.env.AHD_CHROMIUM_PATH ?? process.env.CHROMIUM_PATH;
  if (env && existsSync(env)) return env;
  for (const p of [
    "/run/current-system/sw/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/opt/homebrew/bin/chromium",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

const chromiumPath = findChromium();
const skipReason = chromiumPath
  ? null
  : "Chromium binary not found; set AHD_CHROMIUM_PATH or install one of the candidate paths.";

const rule = MOBILE_RULES.find(
  (r) => r.id === "ahd/mobile/scrollable-no-affordance",
);
if (!rule) {
  throw new Error(
    "ahd/mobile/scrollable-no-affordance is missing from MOBILE_RULES; the suite cannot run.",
  );
}

const FIXTURE_BAD = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; font-family: sans-serif; font-size: 16px; line-height: 1.5; }
  /* Wide content with overflow-x:auto and the scrollbar hidden. No
     scroll-snap, no edge mask, no data-scroll-affordance opt-out.
     This is the exact pattern the rule should fire on. */
  nav.scroller {
    width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
    white-space: nowrap;
  }
  nav.scroller::-webkit-scrollbar { display: none; }
  nav.scroller a {
    display: inline-block;
    padding: 12px 20px;
    min-width: 180px;
  }
</style>
</head><body>
<main>
  <p>Body copy long enough to satisfy the substantive-paragraph filter on the body-font-size rule, even though that rule is not what this fixture is testing. The relevant element is the nav below this paragraph.</p>
</main>
<nav class="scroller">
  <a href="#a">Home</a>
  <a href="#b">Taxonomy</a>
  <a href="#c">Methodology</a>
  <a href="#d">Evals</a>
  <a href="#e">Setup</a>
  <a href="#f">Verify</a>
  <a href="#g">Audit</a>
  <a href="#h">Contribute</a>
  <a href="#i">Contribute · agents</a>
  <a href="#j">FAQ</a>
</nav>
</body></html>`;

// Same scrollable region but with scroll-snap, which is one of the
// accepted affordances. The rule must NOT fire here.
const FIXTURE_OK_SNAP = FIXTURE_BAD.replace(
  "white-space: nowrap;",
  "white-space: nowrap; scroll-snap-type: x mandatory;",
);

// Same scrollable region with the data-scroll-affordance opt-out. Rule
// must NOT fire.
const FIXTURE_OK_OPTOUT = FIXTURE_BAD.replace(
  '<nav class="scroller">',
  '<nav class="scroller" data-scroll-affordance="true">',
);

// Region with overflow-x:auto but content that fits within clientWidth
// (no actual overflow). The rule's gate `scrollWidth > clientWidth`
// should reject this case before any affordance check runs.
const FIXTURE_OK_NO_OVERFLOW = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; font-family: sans-serif; font-size: 16px; line-height: 1.5; }
  nav.scroller {
    width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
    white-space: nowrap;
  }
  nav.scroller::-webkit-scrollbar { display: none; }
  nav.scroller a { display: inline-block; padding: 12px 20px; }
</style>
</head><body>
<main><p>Substantive paragraph long enough to count as body text rather than a label, ensuring the body-font-size rule's substantive-paragraph filter does not flag this fixture.</p></main>
<nav class="scroller">
  <a href="#a">Hi</a>
</nav>
</body></html>`;

async function runRule(browser: Browser, html: string) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    const fired = await page.evaluate(rule!.check);
    return fired as Array<{ message: string; snippet?: string }>;
  } finally {
    await context.close();
  }
}

describe.skipIf(!!skipReason)(
  "ahd/mobile/scrollable-no-affordance · browser behaviour",
  () => {
    let browser: Browser;

    it("opens a Chromium instance for the suite", async () => {
      browser = await chromium.launch({
        headless: true,
        executablePath: chromiumPath,
      });
      expect(browser).toBeDefined();
    }, 30_000);

    it("fires on a scrollable region with hidden scrollbar and no affordance", async () => {
      const fired = await runRule(browser, FIXTURE_BAD);
      expect(fired.length).toBeGreaterThan(0);
      const messages = fired.map((f) => f.message).join(" | ");
      expect(messages).toMatch(/scrolls/i);
      expect(messages).toMatch(/hidden scrollbar|no scroll-snap|no cue/i);
    });

    it("does NOT fire when scroll-snap-type is set", async () => {
      const fired = await runRule(browser, FIXTURE_OK_SNAP);
      expect(fired.length).toBe(0);
    });

    it("does NOT fire when data-scroll-affordance opt-out is present", async () => {
      const fired = await runRule(browser, FIXTURE_OK_OPTOUT);
      expect(fired.length).toBe(0);
    });

    it("does NOT fire when there is no actual horizontal overflow", async () => {
      const fired = await runRule(browser, FIXTURE_OK_NO_OVERFLOW);
      expect(fired.length).toBe(0);
    });

    it("closes the Chromium instance", async () => {
      await browser?.close();
    });
  },
);

if (skipReason) {
  describe("ahd/mobile/scrollable-no-affordance · browser behaviour", () => {
    it.skip(`skipped: ${skipReason}`, () => {});
  });
}

// Browser-behaviour smoke for ahd/mobile/list-mark-alignment. Each
// fixture is a Footer-style two-row vertical list with bracketed
// glyph marks: the "BAD" fixture uses unequal-width marks with no
// reserved slot (the bug the rule was extracted from), and the "OK"
// fixtures pin the mark width via min-width or width on the wrapper.
const listRule = MOBILE_RULES.find(
  (r) => r.id === "ahd/mobile/list-mark-alignment",
);
if (!listRule) {
  throw new Error(
    "ahd/mobile/list-mark-alignment is missing from MOBILE_RULES; the suite cannot run.",
  );
}

const FIXTURE_LIST_BAD = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; font: 16px/1.5 sans-serif; }
  /* Footer-style stacked-link list. The .mark spans intentionally
     have NO min-width: [¶] and [›_] are different widths so the
     "Contribute" text after them lands at different x. This is the
     exact failure mode the rule is for. */
  nav.ftr { display: flex; flex-direction: column; gap: 8px; padding: 16px; }
  nav.ftr a { display: block; text-decoration: none; }
  nav.ftr .mark { display: inline-block; font-family: monospace; }
</style>
</head><body>
<nav class="ftr">
  <a href="/h"><span class="mark">[¶]</span> Contribute · for humans</a>
  <a href="/a"><span class="mark">[›_]</span> Contribute · for agents</a>
</nav>
</body></html>`;

const FIXTURE_LIST_OK_MIN_WIDTH = FIXTURE_LIST_BAD.replace(
  "nav.ftr .mark { display: inline-block; font-family: monospace; }",
  "nav.ftr .mark { display: inline-block; font-family: monospace; min-width: 4ch; }",
);

// A plain vertical list with no leading marks at all. Each <li> has
// only one text node (no post-mark text), so the rule should skip the
// entire list rather than fire on jagged content widths.
const FIXTURE_LIST_OK_NO_MARKS = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; font: 16px/1.5 sans-serif; }
  ul { padding-left: 24px; }
</style>
</head><body>
<ul>
  <li>Apple</li>
  <li>Banana but with a much longer name</li>
  <li>Cherry</li>
</ul>
</body></html>`;

describe.skipIf(!!skipReason)(
  "ahd/mobile/list-mark-alignment · browser behaviour",
  () => {
    let browser: Browser;

    it("opens a Chromium instance for the suite", async () => {
      browser = await chromium.launch({
        headless: true,
        executablePath: chromiumPath,
      });
      expect(browser).toBeDefined();
    }, 30_000);

    it("fires when bracketed marks of unequal width misalign post-mark content", async () => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      try {
        await page.setContent(FIXTURE_LIST_BAD, { waitUntil: "load" });
        const fired = (await page.evaluate(listRule!.check)) as Array<{
          message: string;
          snippet?: string;
        }>;
        expect(fired.length).toBeGreaterThan(0);
        expect(fired[0].message).toMatch(/misaligned post-mark content/i);
        expect(fired[0].message).toMatch(/min-width|reserve/i);
      } finally {
        await context.close();
      }
    });

    it("does NOT fire when the mark wrapper has min-width", async () => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      try {
        await page.setContent(FIXTURE_LIST_OK_MIN_WIDTH, {
          waitUntil: "load",
        });
        const fired = await page.evaluate(listRule!.check);
        expect((fired as unknown[]).length).toBe(0);
      } finally {
        await context.close();
      }
    });

    it("does NOT fire on a plain list with no leading marks", async () => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      try {
        await page.setContent(FIXTURE_LIST_OK_NO_MARKS, { waitUntil: "load" });
        const fired = await page.evaluate(listRule!.check);
        expect((fired as unknown[]).length).toBe(0);
      } finally {
        await context.close();
      }
    });

    it("closes the Chromium instance", async () => {
      await browser?.close();
    });
  },
);

if (skipReason) {
  describe("ahd/mobile/list-mark-alignment · browser behaviour", () => {
    it.skip(`skipped: ${skipReason}`, () => {});
  });
}
