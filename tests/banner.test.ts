import { describe, it, expect } from "vitest";
import { renderBanner, ORNAMENT } from "../src/cli/banner.js";

describe("cli banner", () => {
  it("emits the ornament when stdout is a TTY", () => {
    const out = renderBanner({ isTTY: true });
    expect(out).toContain(ORNAMENT);
    expect(out.endsWith("\n")).toBe(true);
  });

  it("emits nothing when stdout is not a TTY (piped / CI)", () => {
    const out = renderBanner({ isTTY: false });
    expect(out).toBe("");
  });

  it("ornament uses box-drawing characters around 'ahd'", () => {
    expect(ORNAMENT).toMatch(/━+ ahd ━+/);
  });

  it("defaults to the real process.stdout.isTTY when unspecified", () => {
    const prev = process.stdout.isTTY;
    try {
      // @ts-expect-error — force-override for the test
      process.stdout.isTTY = false;
      expect(renderBanner()).toBe("");
      // @ts-expect-error — force-override for the test
      process.stdout.isTTY = true;
      expect(renderBanner()).toContain(ORNAMENT);
    } finally {
      // @ts-expect-error — restore
      process.stdout.isTTY = prev;
    }
  });
});
