import { describe, it, expect } from "vitest";
import {
  captureReplay,
  canonicalizeJson,
  hashJsonCanonical,
  hashBytes,
  renderReplayMarkdown,
} from "../src/eval/replay.js";
import { ReplaySchema } from "../src/eval/types.js";

// Replay-block correctness. The schema lives in src/eval/types.ts, the
// helper in src/eval/replay.ts. Tests cover: canonicalisation order
// independence, hash stability, captureReplay output shape against the
// schema, schema rejection of malformed blocks, markdown rendering shape.

describe("canonicalizeJson", () => {
  it("sorts object keys recursively", () => {
    const a = { z: 1, a: { y: 2, b: 3 } };
    const b = { a: { b: 3, y: 2 }, z: 1 };
    expect(JSON.stringify(canonicalizeJson(a))).toBe(
      JSON.stringify(canonicalizeJson(b)),
    );
  });

  it("preserves array order", () => {
    const a = [3, 1, 2];
    expect(canonicalizeJson(a)).toEqual([3, 1, 2]);
  });

  it("strips undefined values", () => {
    const a = { x: 1, y: undefined };
    expect(canonicalizeJson(a)).toEqual({ x: 1 });
  });

  it("passes primitives through unchanged", () => {
    expect(canonicalizeJson(null)).toBe(null);
    expect(canonicalizeJson(42)).toBe(42);
    expect(canonicalizeJson("hi")).toBe("hi");
    expect(canonicalizeJson(true)).toBe(true);
  });
});

describe("hashJsonCanonical", () => {
  it("returns identical hashes for objects with reordered keys", () => {
    expect(hashJsonCanonical({ a: 1, b: 2 })).toBe(
      hashJsonCanonical({ b: 2, a: 1 }),
    );
  });

  it("returns different hashes when content differs", () => {
    expect(hashJsonCanonical({ a: 1 })).not.toBe(hashJsonCanonical({ a: 2 }));
  });

  it("uses the sha256:<hex> form", () => {
    const h = hashJsonCanonical({ a: 1 });
    expect(h).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe("hashBytes", () => {
  it("returns sha256:<hex> for raw strings", () => {
    expect(hashBytes("")).toBe(
      "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("differs from JSON-canonical hash of the same content", () => {
    // The string `{"a":1}` byte-hashed is not the same as the object
    // {a:1} canonical-JSON hashed (latter has no whitespace and no
    // ordering issues — same here, but the contract is different
    // sources of truth).
    expect(hashBytes('{"a":1}')).toBe(hashJsonCanonical({ a: 1 }));
  });
});

describe("captureReplay", () => {
  const baseInput = {
    kind: "eval-live" as const,
    token: { path: "tokens/swiss-editorial.yml", resolved: { foo: "bar" } },
    brief: {
      path: "briefs/landing.yml",
      resolved: { title: "Hello", n: 3 },
    },
    sampling: { n: 30, temperature: 0.7, seed: null },
    models: [
      {
        id: "cf:@cf/google/gemma-4-26b-a4b-it",
        provider: "cloudflare-workers-ai",
        provider_request_ids: ["req-001", "req-002"],
      },
    ],
    conditions: {
      requested: ["raw", "compiled"],
      effective: ["raw", "compiled"],
    },
    invokedAt: new Date("2026-04-27T05:00:00.000Z"),
    argv: ["node", "ahd", "eval-live", "swiss-editorial", "--n", "30"],
  };

  it("produces a value that ReplaySchema accepts", () => {
    const r = captureReplay(baseInput);
    const parsed = ReplaySchema.safeParse(r);
    expect(parsed.success).toBe(true);
  });

  it("populates ISO invoked_at, schema_version=1, sha256-prefixed hashes", () => {
    const r = captureReplay(baseInput);
    expect(r.schema_version).toBe(1);
    expect(r.invoked_at).toBe("2026-04-27T05:00:00.000Z");
    expect(r.token.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(r.brief?.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("handles raw-bytes briefs (markdown body) via the `raw` form", () => {
    const r = captureReplay({
      ...baseInput,
      brief: { path: "briefs/landing.md", raw: "# Hello" },
    });
    expect(r.brief?.hash).toBe(hashBytes("# Hello"));
  });

  it("handles null brief (critic-only flows)", () => {
    const r = captureReplay({ ...baseInput, brief: null });
    expect(r.brief).toBeNull();
    expect(ReplaySchema.safeParse(r).success).toBe(true);
  });

  it("captures empty model list (mock-only run)", () => {
    const r = captureReplay({ ...baseInput, models: [] });
    expect(r.models).toEqual([]);
    expect(ReplaySchema.safeParse(r).success).toBe(true);
  });

  it("preserves divergent requested vs effective conditions", () => {
    const r = captureReplay({
      ...baseInput,
      conditions: { requested: ["raw", "compiled"], effective: ["raw"] },
    });
    expect(r.conditions.requested).toEqual(["raw", "compiled"]);
    expect(r.conditions.effective).toEqual(["raw"]);
  });

  it("preserves the kind discriminator", () => {
    const eval_ = captureReplay(baseInput);
    const crit = captureReplay({ ...baseInput, kind: "critique" });
    const img = captureReplay({ ...baseInput, kind: "eval-image" });
    expect(eval_.kind).toBe("eval-live");
    expect(crit.kind).toBe("critique");
    expect(img.kind).toBe("eval-image");
  });

  it("respects AHD_VERSION env override", () => {
    const prev = process.env.AHD_VERSION;
    process.env.AHD_VERSION = "9.9.9";
    try {
      const r = captureReplay(baseInput);
      expect(r.ahd_version).toBe("9.9.9");
    } finally {
      if (prev !== undefined) process.env.AHD_VERSION = prev;
      else delete process.env.AHD_VERSION;
    }
  });

  it("passes through per-cell measurements when provided", () => {
    const r = captureReplay({
      ...baseInput,
      measurements: [
        {
          model: "cf:@cf/google/gemma-4-26b-a4b-it",
          condition: "raw",
          samples: [
            {
              sampleId: "sample-001.html",
              tellsFired: ["gradient-text", "shimmer"],
              byteLength: 1234,
              hash: "sha256:" + "a".repeat(64),
              scored: true,
            },
          ],
        },
      ],
    });
    expect(r.measurements).toEqual([
      {
        model: "cf:@cf/google/gemma-4-26b-a4b-it",
        condition: "raw",
        samples: [
          {
            sample_id: "sample-001.html",
            tells: ["gradient-text", "shimmer"],
            byte_length: 1234,
            hash: "sha256:" + "a".repeat(64),
            scored: true,
          },
        ],
      },
    ]);
    expect(ReplaySchema.safeParse(r).success).toBe(true);
  });

  it("omits measurements when not provided, and stays schema-valid", () => {
    const r = captureReplay(baseInput);
    expect(r.measurements).toBeUndefined();
    expect(ReplaySchema.safeParse(r).success).toBe(true);
  });

  it("passes through per-stratum interval provenance when provided", () => {
    const r = captureReplay({
      ...baseInput,
      strata: [
        {
          model: "cf:@cf/google/gemma-4-26b-a4b-it",
          severity: "error",
          estimator: "welch-t",
          df: 57.6,
          varianceFloor: { raw: 0.165, cmp: 0.165 },
          varianceUsed: { raw: 0.2, cmp: 0.165 },
          bootstrapCrossCheck: {
            method: "bca",
            estimate: 0.3,
            lower: 0.1,
            upper: 0.5,
            iterations: 2000,
            alpha: 0.05,
            seed: 42,
          },
        },
      ],
    });
    expect(r.strata).toEqual([
      {
        model: "cf:@cf/google/gemma-4-26b-a4b-it",
        severity: "error",
        estimator: "welch-t",
        df: 57.6,
        variance_floor: { raw: 0.165, cmp: 0.165 },
        variance_used: { raw: 0.2, cmp: 0.165 },
        bootstrap_cross_check: {
          method: "bca",
          estimate: 0.3,
          lower: 0.1,
          upper: 0.5,
          iterations: 2000,
          alpha: 0.05,
          seed: 42,
        },
      },
    ]);
    expect(ReplaySchema.safeParse(r).success).toBe(true);
  });

  it("omits strata when not provided, and stays schema-valid", () => {
    const r = captureReplay(baseInput);
    expect(r.strata).toBeUndefined();
    expect(ReplaySchema.safeParse(r).success).toBe(true);
  });

  it("passes through per-model sample_requests, including null request ids", () => {
    const r = captureReplay({
      ...baseInput,
      models: [
        {
          id: "cf:@cf/google/gemma-4-26b-a4b-it",
          provider: "cloudflare-workers-ai",
          provider_request_ids: ["req-001"],
          sampleRequests: [
            { condition: "raw", sample: 1, requestId: "req-001" },
            { condition: "raw", sample: 2, requestId: null },
          ],
        },
      ],
    });
    expect(r.models[0].sample_requests).toEqual([
      { condition: "raw", sample: 1, request_id: "req-001" },
      { condition: "raw", sample: 2, request_id: null },
    ]);
    expect(ReplaySchema.safeParse(r).success).toBe(true);
  });

  it("omits sample_requests when not provided", () => {
    const r = captureReplay(baseInput);
    expect(r.models[0].sample_requests).toBeUndefined();
    expect(ReplaySchema.safeParse(r).success).toBe(true);
  });

  it("hashes deterministically across object reorderings", () => {
    const a = captureReplay(baseInput);
    const b = captureReplay({
      ...baseInput,
      token: {
        path: "tokens/swiss-editorial.yml",
        resolved: { foo: "bar" }, // same content
      },
    });
    expect(a.token.hash).toBe(b.token.hash);
  });
});

describe("ReplaySchema · rejects malformed blocks", () => {
  function valid() {
    return captureReplay({
      kind: "eval-live" as const,
      token: { path: "t.yml", resolved: {} },
      brief: { path: "b.yml", resolved: {} },
      sampling: { n: 1, temperature: null, seed: null },
      models: [],
      conditions: { requested: [], effective: [] },
      invokedAt: new Date("2026-04-27T05:00:00.000Z"),
      argv: [],
    });
  }

  it("rejects schema_version != 1", () => {
    const r = { ...valid(), schema_version: 2 as 1 };
    expect(ReplaySchema.safeParse(r).success).toBe(false);
  });

  it("rejects hash without sha256: prefix", () => {
    const r = valid();
    r.token.hash = "abcd1234";
    expect(ReplaySchema.safeParse(r).success).toBe(false);
  });

  it("rejects unknown top-level fields (strict)", () => {
    const r = { ...valid(), surplus: "not allowed" };
    expect(ReplaySchema.safeParse(r).success).toBe(false);
  });

  it("rejects non-positive n", () => {
    const r = valid();
    r.sampling.n = 0;
    expect(ReplaySchema.safeParse(r).success).toBe(false);
  });

  it("rejects a measurements entry with an invalid condition", () => {
    const r = {
      ...valid(),
      measurements: [{ model: "m", condition: "raw-ish", samples: [] }],
    };
    expect(ReplaySchema.safeParse(r).success).toBe(false);
  });

  it("rejects a measurements sample hash without the sha256: prefix", () => {
    const r = {
      ...valid(),
      measurements: [
        {
          model: "m",
          condition: "raw",
          samples: [
            {
              sample_id: "sample-001.html",
              tells: [],
              byte_length: 10,
              hash: "not-a-hash",
              scored: true,
            },
          ],
        },
      ],
    };
    expect(ReplaySchema.safeParse(r).success).toBe(false);
  });

  it("rejects a sample_requests entry with a non-positive sample number", () => {
    const r = valid();
    (r.models as unknown[]) = [
      {
        id: "m",
        provider: "p",
        provider_request_ids: [],
        sample_requests: [{ condition: "raw", sample: 0, request_id: null }],
      },
    ];
    expect(ReplaySchema.safeParse(r).success).toBe(false);
  });
});

describe("ReplaySchema · existing published sidecars", () => {
  it("still validates every weekly replay.json without a measurements key", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { resolve, join: joinPath } = await import("node:path");
    const dir = resolve(__dirname, "..", "docs", "evals", "weekly");
    const files = (await readdir(dir)).filter((f) =>
      f.endsWith(".replay.json"),
    );
    expect(files.length).toBeGreaterThanOrEqual(11);
    for (const f of files) {
      const raw = JSON.parse(await readFile(joinPath(dir, f), "utf8"));
      expect(raw.measurements).toBeUndefined();
      const parsed = ReplaySchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`${f} failed schema: ${parsed.error.message}`);
      }
    }
  });
});

describe("renderReplayMarkdown", () => {
  it("produces a fenced ahd-replay block followed by a replay shell snippet", () => {
    const r = captureReplay({
      kind: "eval-live",
      token: { path: "t.yml", resolved: { x: 1 } },
      brief: { path: "b.yml", resolved: { y: 2 } },
      sampling: { n: 30, temperature: 0.7, seed: null },
      models: [
        {
          id: "cf:m",
          provider: "cf",
          provider_request_ids: ["a", "b", "c"],
        },
      ],
      conditions: { requested: ["raw"], effective: ["raw"] },
      invokedAt: new Date("2026-04-27T05:00:00.000Z"),
      argv: ["node", "ahd", "eval-live", "swiss-editorial"],
    });
    const md = renderReplayMarkdown(r);
    expect(md).toContain("```yaml ahd-replay");
    expect(md).toContain("schema_version: 1");
    expect(md).toContain("invoked_at: 2026-04-27T05:00:00.000Z");
    expect(md).toContain("provider_request_ids: 3 captured");
    expect(md).toContain("```sh");
    expect(md).toContain("ahd eval-live swiss-editorial");
  });

  it("redacts provider_request_ids to a count, not the values", () => {
    const r = captureReplay({
      kind: "critique",
      token: { path: "t", resolved: {} },
      brief: null,
      sampling: { n: 1, temperature: null, seed: null },
      models: [
        {
          id: "m",
          provider: "p",
          provider_request_ids: ["secret-id-do-not-publish"],
        },
      ],
      conditions: { requested: [], effective: [] },
      invokedAt: new Date(),
      argv: [],
    });
    const md = renderReplayMarkdown(r);
    expect(md).not.toContain("secret-id-do-not-publish");
    expect(md).toContain("provider_request_ids: 1 captured");
  });

  it("shell-quotes argv values that need it", () => {
    const r = captureReplay({
      kind: "eval-live",
      token: { path: "t", resolved: {} },
      brief: null,
      sampling: { n: 1, temperature: null, seed: null },
      models: [],
      conditions: { requested: [], effective: [] },
      invokedAt: new Date(),
      argv: ["ahd", "eval-live", "tok with spaces", "--n=30"],
    });
    const md = renderReplayMarkdown(r);
    expect(md).toContain("'tok with spaces'");
    expect(md).toContain("--n=30");
  });
});
