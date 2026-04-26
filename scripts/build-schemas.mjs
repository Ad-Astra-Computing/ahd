#!/usr/bin/env node
// Generate schema/*.schema.json from the Zod source of truth in
// dist/eval/types.js. Runs on `npm run build` (postbuild). The
// generated JSON is committed so external consumers can read the
// schema without running the build, but it's a build artefact: never
// hand-edit. The parity test in tests/schema-parity.test.ts asserts
// that the on-disk JSON matches what regenerating from Zod would
// produce, so a hand-edit is caught at CI time.
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distTypes = resolve(root, "dist", "eval", "types.js");

if (!existsSync(distTypes)) {
  console.error(
    `build-schemas: dist/eval/types.js not found. Run 'tsc' first or use 'npm run build'.`,
  );
  process.exit(2);
}

const {
  ManifestCurrentSchema,
  ManifestTargetSchema,
  SampleEnvelopeTargetSchema,
  RulesManifestSchema,
} = await import(pathToFileURL(distTypes).href);

const schemaDir = resolve(root, "schema");
mkdirSync(schemaDir, { recursive: true });

function emit(name, zodSchema, $id, title) {
  const out = zodToJsonSchema(zodSchema, {
    name,
    target: "jsonSchema2019-09",
    $refStrategy: "none",
  });
  // Pull the named definition up so the file root is the schema, not a
  // wrapper with a $defs pointer. zod-to-json-schema produces a
  // {$ref, definitions} envelope when a name is given; we flatten it.
  const flat = out?.definitions?.[name] ?? out;
  flat["$schema"] = "https://json-schema.org/draft/2020-12/schema";
  flat["$id"] = $id;
  if (title) flat.title = title;
  const target = resolve(schemaDir, `${name}.schema.json`);
  writeFileSync(target, JSON.stringify(flat, null, 2) + "\n");
  console.error(`wrote ${target}`);
}

emit(
  "manifest.current",
  ManifestCurrentSchema,
  "https://ahd.adastra.computer/schema/manifest.current.schema.json",
  "AHD eval submission manifest (current shape)",
);
emit(
  "manifest.target",
  ManifestTargetSchema,
  "https://ahd.adastra.computer/schema/manifest.target.schema.json",
  "AHD eval submission manifest (target shape)",
);
emit(
  "sample-envelope.target",
  SampleEnvelopeTargetSchema,
  "https://ahd.adastra.computer/schema/sample-envelope.target.schema.json",
  "AHD per-sample envelope (target shape)",
);
emit(
  "rules.manifest",
  RulesManifestSchema,
  "https://ahd.adastra.computer/schema/rules.manifest.schema.json",
  "AHD rules manifest (governance Layer 1)",
);
