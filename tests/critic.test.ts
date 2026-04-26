import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mockCritic,
  VISION_RULES,
  buildCriticPrompt,
  anthropicVisionCritic,
} from "../src/critique/critic.js";

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

// Anthropic vision critic — parse-failure handling. Returning [] on
// parse failure silently masquerades as a clean sample and undercounts
// vision tells in the aggregated report. The critic must instead emit
// an explicit ahd/critic-parse-failed warning that surfaces the
// failure mode in the per-tell frequency table. Same pattern the
// claude-code critic uses; this suite locks the behaviour.
describe("anthropic vision critic · parse failure surfaces ahd/critic-parse-failed", () => {
  const originalFetch = globalThis.fetch;

  function mockResponseText(text: string) {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as any;
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("emits critic-parse-failed when the model returns no JSON object", async () => {
    mockResponseText("the model decided to write prose instead of JSON today");
    const critic = anthropicVisionCritic({
      apiKey: "test-key",
      model: "claude-haiku-4-5-20251001",
    });
    const v = await critic.critique({
      token: "swiss-editorial",
      imageBase64: "iVBORw0K",
    });
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("ahd/critic-parse-failed");
    expect(v[0].message).toMatch(/no JSON object/i);
  });

  it("emits critic-parse-failed when the JSON does not include a fired array", async () => {
    mockResponseText('{"summary": "looks fine"}');
    const critic = anthropicVisionCritic({
      apiKey: "test-key",
      model: "claude-haiku-4-5-20251001",
    });
    const v = await critic.critique({
      token: "swiss-editorial",
      imageBase64: "iVBORw0K",
    });
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("ahd/critic-parse-failed");
    expect(v[0].message).toMatch(/missing 'fired'/);
  });

  it("emits critic-parse-failed when fired is not an array", async () => {
    mockResponseText('{"fired": "ahd/no-corporate-memphis"}');
    const critic = anthropicVisionCritic({
      apiKey: "test-key",
      model: "claude-haiku-4-5-20251001",
    });
    const v = await critic.critique({
      token: "swiss-editorial",
      imageBase64: "iVBORw0K",
    });
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("ahd/critic-parse-failed");
    expect(v[0].message).toMatch(/'fired' is not an array/);
  });

  it("emits critic-parse-failed when JSON.parse throws", async () => {
    mockResponseText("{ this is not valid json }");
    const critic = anthropicVisionCritic({
      apiKey: "test-key",
      model: "claude-haiku-4-5-20251001",
    });
    const v = await critic.critique({
      token: "swiss-editorial",
      imageBase64: "iVBORw0K",
    });
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("ahd/critic-parse-failed");
    expect(v[0].message).toMatch(/JSON\.parse failed/);
  });

  it("returns rule violations normally when the response parses cleanly", async () => {
    mockResponseText(
      '{"fired": ["ahd/no-corporate-memphis"], "rationale": {"ahd/no-corporate-memphis": "noodle limbs visible"}}',
    );
    const critic = anthropicVisionCritic({
      apiKey: "test-key",
      model: "claude-haiku-4-5-20251001",
    });
    const v = await critic.critique({
      token: "swiss-editorial",
      imageBase64: "iVBORw0K",
    });
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("ahd/no-corporate-memphis");
    expect(v[0].message).toBe("noodle limbs visible");
  });
});
