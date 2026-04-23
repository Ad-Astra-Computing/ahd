import { describe, it, expect } from "vitest";
import { MOBILE_RULES } from "../src/mobile/rules.js";

// Unit-level sanity for the mobile rule descriptors. The actual
// `check` functions run inside the browser via Playwright's
// page.evaluate, so we can't run them directly in vitest — we verify
// the metadata and that each rule shape is valid.

describe("mobile rules · descriptors", () => {
  it("ships four mobile rules", () => {
    expect(MOBILE_RULES).toHaveLength(4);
  });

  it("every rule has an ahd/mobile/* id", () => {
    for (const r of MOBILE_RULES) {
      expect(r.id.startsWith("ahd/mobile/")).toBe(true);
    }
  });

  it("every rule has a non-empty description and check fn", () => {
    for (const r of MOBILE_RULES) {
      expect(r.description.length).toBeGreaterThan(20);
      expect(typeof r.check).toBe("function");
    }
  });

  it("includes the four named rules", () => {
    const ids = new Set(MOBILE_RULES.map((r) => r.id));
    expect(ids).toContain("ahd/mobile/no-horizontal-overflow");
    expect(ids).toContain("ahd/mobile/tap-target-size");
    expect(ids).toContain("ahd/mobile/body-font-size");
    expect(ids).toContain("ahd/mobile/viewport-meta-present");
  });

  it("assigns error to overflow and viewport-meta, warn to the rest", () => {
    const byId = Object.fromEntries(MOBILE_RULES.map((r) => [r.id, r]));
    expect(byId["ahd/mobile/no-horizontal-overflow"].severity).toBe("error");
    expect(byId["ahd/mobile/viewport-meta-present"].severity).toBe("error");
    expect(byId["ahd/mobile/tap-target-size"].severity).toBe("warn");
    expect(byId["ahd/mobile/body-font-size"].severity).toBe("warn");
  });
});
