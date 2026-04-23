import { describe, it, expect } from "vitest";
import { mockCritic, VISION_RULES, buildCriticPrompt } from "../src/critique/critic.js";

describe("vision critic", () => {
  it("ships fourteen vision-only rules (9 web/graphic + 4 image-specific + 1 layout)", () => {
    expect(VISION_RULES).toHaveLength(14);
    const imageRules = VISION_RULES.filter((r) => r.id.startsWith("ahd/image/"));
    expect(imageRules).toHaveLength(4);
    const layoutRules = VISION_RULES.filter((r) => r.id === "ahd/layout-deadspace");
    expect(layoutRules).toHaveLength(1);
    for (const r of VISION_RULES) {
      expect(r.id.startsWith("ahd/")).toBe(true);
      expect(r.description.length).toBeGreaterThan(10);
      expect(r.prompt.length).toBeGreaterThan(10);
    }
  });

  it("buildCriticPrompt includes every rule id", () => {
    const prompt = buildCriticPrompt("swiss-editorial");
    for (const r of VISION_RULES) {
      expect(prompt).toContain(r.id);
    }
  });

  it("mock critic returns rules from the fixture", async () => {
    const critic = mockCritic({
      "sample-1": ["ahd/require-asymmetry", "ahd/no-corporate-memphis"],
    });
    const v = await critic.critique({ token: "swiss-editorial", url: "sample-1" });
    expect(v.map((x) => x.ruleId)).toEqual([
      "ahd/require-asymmetry",
      "ahd/no-corporate-memphis",
    ]);
  });

  it("mock critic returns empty when fixture has no entry", async () => {
    const critic = mockCritic({});
    const v = await critic.critique({ token: "swiss-editorial", url: "unknown" });
    expect(v).toHaveLength(0);
  });
});
