import { describe, it, expect } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BriefSchema } from "../src/types.js";
import { loadBrief } from "../src/load.js";

async function writeBrief(yaml: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ahd-brief-"));
  const path = join(dir, "brief.yml");
  await writeFile(path, yaml);
  return path;
}

describe("BriefSchema strict mode", () => {
  // The whole reason for .strict() is to surface typos that would
  // otherwise drop intended instructions silently. Lock that
  // behaviour with explicit fixtures.
  it("rejects a misspelled mustInclude field (mustInlcude)", () => {
    const r = BriefSchema.safeParse({
      intent: "test",
      surfaces: ["web"],
      mustInlcude: ["a item the user actually wanted"],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const messages = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      expect(messages.join(" ")).toMatch(/mustInlcude|unrecognized/i);
    }
  });

  it("rejects 'surface' singular (typo for 'surfaces')", () => {
    const r = BriefSchema.safeParse({
      intent: "test",
      surface: ["web"],
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown field at the root", () => {
    const r = BriefSchema.safeParse({
      intent: "test",
      surfaces: ["web"],
      style: "moody",
    });
    expect(r.success).toBe(false);
  });

  it("accepts a well-formed brief with no extra keys", () => {
    const r = BriefSchema.safeParse({
      intent: "build a portfolio",
      surfaces: ["web"],
      mustInclude: ["one quirk"],
      mustAvoid: ["gradients"],
    });
    expect(r.success).toBe(true);
  });

  it("loadBrief surfaces strict-mode rejections with a helpful path", async () => {
    const path = await writeBrief(
      "intent: test\nsurfaces:\n  - web\nmustInlcude:\n  - typo\n",
    );
    await expect(loadBrief(path)).rejects.toThrow(/mustInlcude|unrecognized/i);
  });
});
