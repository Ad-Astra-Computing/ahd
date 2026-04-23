import type { Brief, CompiledBrief, StyleToken } from "./types.js";

export function compile(brief: Brief, token: StyleToken): CompiledBrief {
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
      claude: assemble("claude", userFrame, positive, negative, spec),
      gpt: assemble("gpt", userFrame, positive, negative, spec),
      gemini: assemble("gemini", userFrame, positive, negative, spec),
      generic: assemble("generic", userFrame, positive, negative, spec),
    },
  };
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
): string {
  const header = `# AHD Compiled Prompt — target: ${model}`;
  const citeRule =
    "Every design decision in your output must cite the brief rule it follows, as an inline comment (HTML: <!-- rule: ... -->, CSS: /* rule: ... */, JSX: {/* rule: ... */}).";
  const forbidLine = "Violating the FORBIDDEN list is a bug. If you feel yourself reaching for a forbidden pattern, stop and pick a different solution.";
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
    `- ${citeRule}`,
    `- ${forbidLine}`,
    "- Produce three divergent directions before settling on one. Name the movement anchor each direction draws from.",
    "- Include at least one intentional imperfection from the required-quirks list.",
    "- When in doubt, remove.",
  ].join("\n");
}
