import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  ManifestCurrentSchema,
  ManifestTargetSchema,
  SampleEnvelopeTargetSchema,
} from "../src/eval/types.js";

const ROOT = resolve(__dirname, "..");

describe("submission-schema · current shape", () => {
  it("accepts a minimal real manifest", () => {
    const sample = {
      token: "swiss-editorial",
      briefPath: "briefs/landing.yml",
      n: 30,
      maxTokens: 12000,
      runAt: "2026-04-22T10:00:00.000Z",
      models: [
        {
          spec: "claude-code:claude-opus-4-7",
          canonicalId: "claude-opus-4-7",
          sanitizedId: "claude-opus-4-7",
          provider: "claude-code-cli",
        },
      ],
    };
    const r = ManifestCurrentSchema.safeParse(sample);
    expect(r.success).toBe(true);
  });

  it("rejects a manifest missing required fields", () => {
    const r = ManifestCurrentSchema.safeParse({ token: "swiss-editorial" });
    expect(r.success).toBe(false);
  });

  it("rejects a non-kebab-case token id (defensive)", () => {
    const r = ManifestCurrentSchema.safeParse({
      token: "Swiss_Editorial",
      briefPath: "briefs/landing.yml",
      n: 30,
      runAt: "2026-04-22T10:00:00.000Z",
      models: [
        {
          spec: "x:y",
          canonicalId: "y",
          sanitizedId: "y",
          provider: "x",
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  // Real fixture sweep: every manifest.json under evals/ must parse.
  // This is the drift-detection test the audit asked for: if a runner
  // change shifts the manifest shape and the schema doesn't follow,
  // CI catches it before merge.
  const evalsDir = resolve(ROOT, "evals");
  const realManifests: string[] = existsSync(evalsDir)
    ? readdirSync(evalsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
        .map((d) => join(evalsDir, d.name, "manifest.json"))
        .filter((p) => existsSync(p))
    : [];

  if (realManifests.length === 0) {
    it.skip("real manifests parse against current schema (no fixtures present)", () => {});
  } else {
    for (const path of realManifests) {
      const rel = path.replace(ROOT + "/", "");
      it(`real manifest parses: ${rel}`, () => {
        const raw = JSON.parse(readFileSync(path, "utf8"));
        const r = ManifestCurrentSchema.safeParse(raw);
        if (!r.success) {
          throw new Error(
            `Schema drift in ${rel}: ${r.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")}`,
          );
        }
        expect(r.success).toBe(true);
      });
    }
  }
});

describe("submission-schema · target shape", () => {
  it("rejects a current-shape manifest as missing target fields", () => {
    const minimal = {
      token: "swiss-editorial",
      briefPath: "briefs/landing.yml",
      n: 30,
      runAt: "2026-04-22T10:00:00.000Z",
      models: [
        {
          spec: "claude-code:claude-opus-4-7",
          canonicalId: "claude-opus-4-7",
          sanitizedId: "claude-opus-4-7",
          provider: "claude-code-cli",
        },
      ],
    };
    const r = ManifestTargetSchema.safeParse(minimal);
    expect(r.success).toBe(false);
    if (!r.success) {
      const missing = r.error.issues.map((i) => i.path.join("."));
      expect(missing.join(",")).toMatch(/servingPath|runnerVersion/);
    }
  });

  it("accepts a fully-populated target-shape manifest", () => {
    const full = {
      token: "swiss-editorial",
      briefPath: "briefs/landing.yml",
      n: 30,
      runAt: "2026-04-22T10:00:00.000Z",
      models: [
        {
          spec: "claude-code:claude-opus-4-7",
          canonicalId: "claude-opus-4-7",
          sanitizedId: "claude-opus-4-7",
          provider: "claude-code-cli",
          servingPath: "claude-code-cli://1.x/keychain",
          cliVersion: "2.0.0",
          runnerVersion: "0.8.3",
          requestIds: ["anth_req_abc123"],
        },
      ],
    };
    const r = ManifestTargetSchema.safeParse(full);
    expect(r.success).toBe(true);
  });
});

describe("submission-schema · sample envelope target", () => {
  it("accepts a populated envelope", () => {
    const env = {
      sampleId: "sample-001",
      cell: "claude-opus-4-7",
      condition: "compiled" as const,
      seed: 1,
      requestId: "anth_req_abc123",
      finishReason: "end_turn",
      tokenUsage: { inputTokens: 1234, outputTokens: 5678, totalTokens: 6912 },
      extractedHtml: "<!doctype html>...",
    };
    const r = SampleEnvelopeTargetSchema.safeParse(env);
    expect(r.success).toBe(true);
  });

  it("requires extractedHtml to be non-empty", () => {
    const r = SampleEnvelopeTargetSchema.safeParse({
      sampleId: "x",
      cell: "y",
      condition: "raw",
      extractedHtml: "",
    });
    expect(r.success).toBe(false);
  });
});

describe("submission-schema · JSON Schema parity (build artefact in sync)", () => {
  // The schema/*.schema.json files on disk are committed build
  // artefacts generated from the Zod source by scripts/build-schemas.mjs.
  // This test re-runs the same generation in-process and asserts the
  // on-disk JSON matches: a hand-edit of the JSON without updating the
  // Zod source fails CI.
  function regenerate(name: string, schema: any): unknown {
    const out = zodToJsonSchema(schema, {
      name,
      target: "jsonSchema2019-09",
      $refStrategy: "none",
    }) as any;
    const flat = out?.definitions?.[name] ?? out;
    flat["$schema"] = "https://json-schema.org/draft/2020-12/schema";
    flat["$id"] = `https://ahd.adastra.computer/schema/${name}.schema.json`;
    return flat;
  }

  it("manifest.current.schema.json matches Zod regeneration", () => {
    const onDisk = JSON.parse(
      readFileSync(resolve(ROOT, "schema/manifest.current.schema.json"), "utf8"),
    );
    const regen = regenerate("manifest.current", ManifestCurrentSchema) as any;
    regen.title = onDisk.title; // build script overrides title; not derivable
    expect(onDisk).toEqual(regen);
  });

  it("manifest.target.schema.json matches Zod regeneration", () => {
    const onDisk = JSON.parse(
      readFileSync(resolve(ROOT, "schema/manifest.target.schema.json"), "utf8"),
    );
    const regen = regenerate("manifest.target", ManifestTargetSchema) as any;
    regen.title = onDisk.title;
    expect(onDisk).toEqual(regen);
  });

  it("sample-envelope.target.schema.json matches Zod regeneration", () => {
    const onDisk = JSON.parse(
      readFileSync(resolve(ROOT, "schema/sample-envelope.target.schema.json"), "utf8"),
    );
    const regen = regenerate(
      "sample-envelope.target",
      SampleEnvelopeTargetSchema,
    ) as any;
    regen.title = onDisk.title;
    expect(onDisk).toEqual(regen);
  });
});

describe("submission-schema · CLI", () => {
  // CLI smoke: validate-submission against a known-good fixture
  // returns exit 0 and reports current PASS. Drift in the manifest
  // surface area would surface here too.
  const cli = resolve(ROOT, "bin/ahd.js");
  const fixture = resolve(ROOT, "evals/post-digital-green");
  if (existsSync(join(fixture, "manifest.json"))) {
    it("validates the post-digital-green run against current schema", () => {
      const out = execFileSync("node", [cli, "validate-submission", fixture], {
        encoding: "utf8",
      });
      expect(out).toMatch(/current schema: PASS/);
    });
  } else {
    it.skip("validates a real run (fixture missing)", () => {});
  }
});
