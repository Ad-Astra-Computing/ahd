import type { Brief, CompiledBrief, StyleToken } from "./types.js";

export type CompileMode = "draft" | "final";

export function compile(
  brief: Brief,
  token: StyleToken,
  mode: CompileMode = "draft",
): CompiledBrief {
  const spec = {
    intent: brief.intent,
    audience: brief.audience,
    surfaces: brief.surfaces,
    token: { id: token.id, name: token.name, version: token.version },
    type: token.type,
    colour: token.colour,
    grid: token.grid,
    space: token.space,
    surface: token.surface,
    forbidden: [...token.forbidden, ...(brief.mustAvoid ?? [])],
    required: [...token["required-quirks"], ...(brief.mustInclude ?? [])],
    copy: token.copy,
  };

  const positive = token["prompt-fragments"].system;
  const negative = token["prompt-fragments"].negative;
  const userFrame = framing(brief);

  return {
    brief,
    token,
    spec,
    prompts: {
      claude: assemble("claude", userFrame, positive, negative, spec, mode),
      gpt: assemble("gpt", userFrame, positive, negative, spec, mode),
      gemini: assemble("gemini", userFrame, positive, negative, spec, mode),
      generic: assemble("generic", userFrame, positive, negative, spec, mode),
    },
  };
}

export function compileImagePrompt(
  brief: Brief,
  token: StyleToken,
): { prompt: string; negativePrompt: string } {
  const fragments = token["prompt-fragments"];
  const styleDirection = fragments.system.trim();
  const forbidden = fragments.negative.trim();
  const required = (token["required-quirks"] ?? []).join(". ");
  const bannedPhrases = token.copy?.["banned-phrases"] ?? [];
  const tokenForbidden = token.forbidden ?? [];

  const positive = [
    brief.intent.trim(),
    "",
    "Style direction:",
    styleDirection,
    required ? `Required qualities: ${required}.` : "",
    brief.mustInclude?.length ? `Must include: ${brief.mustInclude.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const negative = [
    forbidden,
    tokenForbidden.length ? `Absolutely avoid: ${tokenForbidden.join(", ")}.` : "",
    bannedPhrases.length ? `No text containing: ${bannedPhrases.join(", ")}.` : "",
    brief.mustAvoid?.length ? `Also avoid: ${brief.mustAvoid.join(", ")}.` : "",
    "corporate memphis, alegria, pastel big-head figures with noodle limbs",
    "six-finger hands, malformed anatomy",
    "iridescent 3D blob, Spline default",
    "AI-smooth subsurface-scatter glow",
    "decorative cursive overlaid on render",
    "midjourney face symmetry",
    "stock laptop-in-office photography",
  ]
    .filter(Boolean)
    .join(" ");

  return { prompt: positive, negativePrompt: negative };
}

export function briefAsProse(brief: Brief): string {
  const parts: string[] = [`Design intent: ${brief.intent.trim()}`];
  if (brief.audience) parts.push(`Audience: ${brief.audience.trim()}`);
  if (brief.surfaces?.length) parts.push(`Surfaces: ${brief.surfaces.join(", ")}`);
  if (brief.mustInclude?.length) {
    parts.push("Must include:");
    for (const item of brief.mustInclude) parts.push(`- ${item}`);
  }
  if (brief.mustAvoid?.length) {
    parts.push("Must avoid:");
    for (const item of brief.mustAvoid) parts.push(`- ${item}`);
  }
  return parts.join("\n");
}

function framing(brief: Brief): string {
  const surfaces = brief.surfaces.join(", ");
  const must = brief.mustInclude?.length
    ? `\n\nMust include: ${brief.mustInclude.map((s) => `- ${s}`).join("\n")}`
    : "";
  const avoid = brief.mustAvoid?.length
    ? `\n\nMust avoid (in addition to the token's forbidden list): ${brief.mustAvoid
        .map((s) => `- ${s}`)
        .join("\n")}`
    : "";
  const audience = brief.audience ? `\n\nAudience: ${brief.audience}` : "";
  return `Brief: ${brief.intent}\nSurfaces: ${surfaces}${audience}${must}${avoid}`;
}

function assemble(
  model: string,
  user: string,
  positive: string,
  negative: string,
  spec: Record<string, unknown>,
  mode: CompileMode,
): string {
  const header = `# AHD Compiled Prompt — target: ${model} — mode: ${mode}`;
  const citeRule =
    "Every design decision in your output must cite the brief rule it follows, as an inline comment (HTML: <!-- rule: ... -->, CSS: /* rule: ... */, JSX: {/* rule: ... */}).";
  const forbidLine =
    "Violating the FORBIDDEN list is a bug. If you feel yourself reaching for a forbidden pattern, stop and pick a different solution.";
  const tokenAnchor =
    spec.token && typeof spec.token === "object" && "id" in (spec.token as Record<string, unknown>)
      ? `Include exactly this meta tag in the document head, verbatim, so downstream tools recognise the active style token: <meta name="ahd-token" content="${(spec.token as { id: string }).id}">.`
      : null;
  const motionRule =
    'Any animation or transition longer than 200ms must be wrapped in `@media (prefers-reduced-motion: no-preference)`, or provide an equivalent path that respects `prefers-reduced-motion: reduce`. WCAG 2.3.3.';

  const workingRules = [`- ${citeRule}`, `- ${forbidLine}`];
  if (tokenAnchor) workingRules.push(`- ${tokenAnchor}`);
  workingRules.push(`- ${motionRule}`);
  if (mode === "draft") {
    workingRules.push(
      "- Produce three divergent directions before settling on one. Name the movement anchor each direction draws from.",
    );
  } else {
    workingRules.push(
      "- Return a single, self-contained, valid HTML5 document. No prose, no fenced code, no multiple directions. Start with <!doctype html> and end with </html>.",
    );
  }
  workingRules.push(
    "- Include at least one intentional imperfection from the required-quirks list.",
    "- When in doubt, remove.",
  );

  return [
    header,
    "",
    "## Style direction",
    positive.trim(),
    "",
    "## FORBIDDEN",
    negative.trim(),
    "",
    "## Brief",
    user,
    "",
    "## Full spec (authoritative)",
    "```json",
    JSON.stringify(spec, null, 2),
    "```",
    "",
    "## Working rules",
    ...workingRules,
  ].join("\n");
}
